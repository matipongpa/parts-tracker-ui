import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AskPanel } from '@/features/assistant/AskPanel';
import { installApiMock, jsonResponse } from '@/test/apiMock';
import { installFakeAskApi, savedEntry } from '@/test/fakeAskApi';
import type { ApiMock } from '@/test/apiMock';
import type { FakeAskApi } from '@/test/fakeAskApi';
import type { UserEvent } from '@testing-library/user-event';

async function renderHistory(): Promise<UserEvent> {
  const user: UserEvent = userEvent.setup();
  const client: QueryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AskPanel open onClose={(): void => undefined} />
    </QueryClientProvider>,
  );
  await user.click(screen.getByRole('button', { name: 'Previous questions' }));
  return user;
}

const SEED = [
  savedEntry('1', 'Which projects use GRM188?', 'It is used in Alpha and Beta.'),
  savedEntry('2', 'List the 0402 capacitors', 'There are 12 of them.'),
];

describe('ask history', (): void => {
  let api: ApiMock;
  let server: FakeAskApi;

  beforeEach((): void => {
    api = installApiMock();
    server = installFakeAskApi(api, SEED);
  });

  afterEach((): void => {
    api.restore();
  });

  function nav(): HTMLElement {
    return screen.getByRole('navigation', { name: 'Your previous questions' });
  }

  async function rowFor(text: string): Promise<HTMLElement> {
    const row: HTMLElement | undefined = (await within(nav()).findAllByRole('listitem')).find(
      (item: HTMLElement): boolean => item.textContent?.includes(text) === true,
    );
    if (!row) throw new Error(`row not found: ${text}`);
    return row;
  }

  it('lists saved questions, newest first', async (): Promise<void> => {
    await renderHistory();

    const rows: HTMLElement[] = await within(nav()).findAllByRole('listitem');
    expect(rows.map((row: HTMLElement): string | null => row.textContent)).toEqual([
      expect.stringContaining('List the 0402 capacitors'),
      expect.stringContaining('Which projects use GRM188?'),
    ]);
  });

  it('opens a saved conversation exactly as it was, without asking the model again', async (): Promise<void> => {
    const user: UserEvent = await renderHistory();
    await user.click(within(await rowFor('Which projects')).getByRole('button', { name: /Which projects use GRM188\?/ }));

    expect(await screen.findByRole('region', { name: 'Answer' })).toHaveTextContent('It is used in Alpha and Beta.');
    expect(screen.getByRole('region', { name: 'Your question' })).toHaveTextContent('Which projects use GRM188?');
    expect(within(screen.getByRole('region', { name: 'Matching parts' })).getByText(/as they were when you asked/)).toBeInTheDocument();

    const posts: number = api.callsTo('/ask').filter((call): boolean => call.init?.method === 'POST').length;
    expect(posts).toBe(0);
  });

  it('marks the open entry in the list', async (): Promise<void> => {
    const user: UserEvent = await renderHistory();
    await user.click(within(await rowFor('List the 0402')).getByRole('button', { name: /List the 0402/ }));
    await screen.findByRole('region', { name: 'Answer' });
    await user.click(screen.getByRole('button', { name: 'Previous questions' }));

    expect(within(await rowFor('List the 0402')).getByRole('button', { name: /List the 0402/ })).toHaveAttribute('aria-current', 'true');
    expect(within(await rowFor('Which projects')).getByRole('button', { name: /Which projects/ })).not.toHaveAttribute('aria-current');
  });

  it('says so when the entry no longer exists on the server', async (): Promise<void> => {
    const user: UserEvent = await renderHistory();
    const row: HTMLElement = await rowFor('Which projects');
    server.entries = server.entries.filter((entry): boolean => entry.id !== '1');
    await user.click(within(row).getByRole('button', { name: /Which projects/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This question is no longer in your history.');
    expect(screen.getByRole('button', { name: 'Ask a new question' })).toBeInTheDocument();
  });

  it('shows an empty state when there is no history yet', async (): Promise<void> => {
    server.entries = [];
    await renderHistory();
    expect(await within(nav()).findByText(/Nothing yet/)).toBeInTheDocument();
  });

  it('shows an error when the history cannot be loaded', async (): Promise<void> => {
    api.on('GET', '/ask/history', (): Response => jsonResponse({ error: 'Failed to load history' }, 500));
    await renderHistory();
    expect(await within(nav()).findByRole('alert')).toHaveTextContent('Failed to load history');
  });

  it('needs two clicks to delete an entry', async (): Promise<void> => {
    const user: UserEvent = await renderHistory();
    const row: HTMLElement = await rowFor('Which projects');
    const deletes = (): number => api.callsTo('/ask/history/1').filter((call): boolean => call.init?.method === 'DELETE').length;

    await user.click(within(row).getByRole('button', { name: 'Delete this question' }));
    expect(deletes()).toBe(0);

    await user.click(within(row).getByRole('button', { name: 'Confirm delete' }));
    expect(deletes()).toBe(1);
    await within(nav()).findByText(/List the 0402 capacitors/);
    expect(within(nav()).queryByText(/Which projects use GRM188/)).not.toBeInTheDocument();
    expect(server.entries.map((e): string => e.id)).toEqual(['2']);
  });

  it('cancels the delete when focus moves away', async (): Promise<void> => {
    const user: UserEvent = await renderHistory();
    const first: HTMLElement | undefined = (await within(nav()).findAllByRole('listitem'))[0];
    if (!first) throw new Error('no rows');

    await user.click(within(first).getByRole('button', { name: 'Delete this question' }));
    expect(within(first).getByRole('button', { name: 'Confirm delete' })).toBeInTheDocument();
    await user.tab();

    expect(within(first).getByRole('button', { name: 'Delete this question' })).toBeInTheDocument();
    expect(server.entries).toHaveLength(2);
  });

  it('goes back to a fresh question when the entry you were viewing is deleted', async (): Promise<void> => {
    const user: UserEvent = await renderHistory();
    await user.click(within(await rowFor('Which projects')).getByRole('button', { name: /Which projects/ }));
    await screen.findByRole('region', { name: 'Answer' });
    await user.click(screen.getByRole('button', { name: 'Previous questions' }));

    const row: HTMLElement = await rowFor('Which projects');
    await user.click(within(row).getByRole('button', { name: 'Delete this question' }));
    await user.click(within(row).getByRole('button', { name: 'Confirm delete' }));
    await waitFor((): void => {
      expect(within(nav()).queryByText(/Which projects use GRM188/)).not.toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Previous questions' }));

    expect(screen.getByLabelText('Your question')).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Answer' })).not.toBeInTheDocument();
  });

  it('shows the server message when a delete fails and keeps the entry', async (): Promise<void> => {
    api.on('DELETE', /\/ask\/history\/\d+$/, (): Response => jsonResponse({ error: 'Failed to load history' }, 500));
    const user: UserEvent = await renderHistory();
    const first: HTMLElement | undefined = (await within(nav()).findAllByRole('listitem'))[0];
    if (!first) throw new Error('no rows');

    await user.click(within(first).getByRole('button', { name: 'Delete this question' }));
    await user.click(within(first).getByRole('button', { name: 'Confirm delete' }));

    expect(await within(nav()).findByRole('alert')).toHaveTextContent('Could not delete');
    expect(within(nav()).getAllByRole('listitem')).toHaveLength(2);
  });
});
