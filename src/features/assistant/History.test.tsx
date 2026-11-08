import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AskLayout } from '@/features/assistant/AskLayout';
import { AskPage } from '@/features/assistant/AskPage';
import { HistoryEntryPage } from '@/features/assistant/HistoryEntryPage';
import { installApiMock, jsonResponse } from '@/test/apiMock';
import { installFakeAskApi, savedEntry } from '@/test/fakeAskApi';
import type { ApiMock } from '@/test/apiMock';
import type { FakeAskApi } from '@/test/fakeAskApi';
import type { UserEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';

function LocationProbe(): ReactElement {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function renderAt(path: string): UserEvent {
  const user: UserEvent = userEvent.setup();
  const client: QueryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/ask" element={<AskLayout />}>
            <Route index element={<AskPage />} />
            <Route path=":id" element={<HistoryEntryPage />} />
          </Route>
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
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

  it('lists saved questions, newest first', async (): Promise<void> => {
    renderAt('/ask');

    const links: HTMLElement[] = await within(nav()).findAllByRole('link');
    expect(links.map((link: HTMLElement): string | null => link.textContent)).toEqual([
      expect.stringContaining('List the 0402 capacitors'),
      expect.stringContaining('Which projects use GRM188?'),
    ]);
  });

  it('opens a saved conversation exactly as it was, without asking the model again', async (): Promise<void> => {
    const user: UserEvent = renderAt('/ask');
    await user.click(await within(nav()).findByRole('link', { name: /Which projects use GRM188\?/ }));

    expect(await screen.findByRole('region', { name: 'Answer' })).toHaveTextContent('It is used in Alpha and Beta.');
    expect(screen.getByRole('region', { name: 'Your question' })).toHaveTextContent('Which projects use GRM188?');
    expect(screen.getByTestId('location')).toHaveTextContent('/ask/1');
    expect(within(screen.getByRole('region', { name: 'Matching parts' })).getByText(/as they were when you asked/)).toBeInTheDocument();

    const posts: number = api.callsTo('/ask').filter((call): boolean => call.init?.method === 'POST').length;
    expect(posts).toBe(0);
  });

  it('opens a saved conversation straight from its URL (reload or bookmark)', async (): Promise<void> => {
    renderAt('/ask/2');
    expect(await screen.findByRole('region', { name: 'Answer' })).toHaveTextContent('There are 12 of them.');
  });

  it('says so when the entry does not exist or belongs to someone else', async (): Promise<void> => {
    renderAt('/ask/999');
    expect(await screen.findByRole('alert')).toHaveTextContent('This question is no longer in your history.');
    expect(screen.getByRole('link', { name: 'Ask a new question' })).toBeInTheDocument();
  });

  it('shows an empty state when there is no history yet', async (): Promise<void> => {
    server.entries = [];
    renderAt('/ask');
    expect(await within(nav()).findByText(/Nothing yet/)).toBeInTheDocument();
  });

  it('shows an error when the history cannot be loaded', async (): Promise<void> => {
    api.on('GET', '/ask/history', (): Response => jsonResponse({ error: 'Failed to load history' }, 500));
    renderAt('/ask');
    expect(await within(nav()).findByRole('alert')).toHaveTextContent('Failed to load history');
  });

  it('needs two clicks to delete an entry', async (): Promise<void> => {
    const user: UserEvent = renderAt('/ask');
    await within(nav()).findAllByRole('link');
    const deletes = (): number => api.callsTo('/ask/history/1').filter((call): boolean => call.init?.method === 'DELETE').length;

    const items: HTMLElement[] = within(nav()).getAllByRole('listitem');
    const row: HTMLElement | undefined = items.find((item: HTMLElement): boolean => item.textContent?.includes('Which projects') === true);
    if (!row) throw new Error('row not found');

    await user.click(within(row).getByRole('button', { name: 'Delete this question' }));
    expect(deletes()).toBe(0);

    await user.click(within(row).getByRole('button', { name: 'Confirm delete' }));
    expect(deletes()).toBe(1);
    await within(nav()).findByText(/List the 0402 capacitors/);
    expect(within(nav()).queryByText(/Which projects use GRM188/)).not.toBeInTheDocument();
    expect(server.entries.map((e): string => e.id)).toEqual(['2']);
  });

  it('cancels the delete when focus moves away', async (): Promise<void> => {
    const user: UserEvent = renderAt('/ask');
    await within(nav()).findAllByRole('link');
    const first: HTMLElement | undefined = within(nav()).getAllByRole('listitem')[0];
    if (!first) throw new Error('no rows');

    await user.click(within(first).getByRole('button', { name: 'Delete this question' }));
    expect(within(first).getByRole('button', { name: 'Confirm delete' })).toBeInTheDocument();
    await user.click(screen.getByLabelText('Your question'));

    expect(within(first).getByRole('button', { name: 'Delete this question' })).toBeInTheDocument();
    expect(server.entries).toHaveLength(2);
  });

  it('leaves the page when the entry you are viewing is deleted', async (): Promise<void> => {
    const user: UserEvent = renderAt('/ask/1');
    await screen.findByRole('region', { name: 'Answer' });
    const row: HTMLElement | undefined = (await within(nav()).findAllByRole('listitem')).find(
      (item: HTMLElement): boolean => item.textContent?.includes('Which projects') === true,
    );
    if (!row) throw new Error('row not found');

    await user.click(within(row).getByRole('button', { name: 'Delete this question' }));
    await user.click(within(row).getByRole('button', { name: 'Confirm delete' }));

    expect(await screen.findByLabelText('Your question')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/ask');
    expect(screen.queryByRole('region', { name: 'Answer' })).not.toBeInTheDocument();
  });

  it('shows the server message when a delete fails and keeps the entry', async (): Promise<void> => {
    api.on('DELETE', /\/ask\/history\/\d+$/, (): Response => jsonResponse({ error: 'Failed to load history' }, 500));
    const user: UserEvent = renderAt('/ask');
    const first: HTMLElement | undefined = (await within(nav()).findAllByRole('listitem'))[0];
    if (!first) throw new Error('no rows');

    await user.click(within(first).getByRole('button', { name: 'Delete this question' }));
    await user.click(within(first).getByRole('button', { name: 'Confirm delete' }));

    expect(await within(nav()).findByRole('alert')).toHaveTextContent('Could not delete');
    expect(within(nav()).getAllByRole('listitem')).toHaveLength(2);
  });
});
