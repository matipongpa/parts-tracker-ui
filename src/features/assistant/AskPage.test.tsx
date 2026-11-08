import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AskLayout } from '@/features/assistant/AskLayout';
import { AskPage } from '@/features/assistant/AskPage';
import { HistoryEntryPage } from '@/features/assistant/HistoryEntryPage';
import { installApiMock, jsonResponse } from '@/test/apiMock';
import { installFakeAskApi } from '@/test/fakeAskApi';
import type { ApiMock } from '@/test/apiMock';
import type { FakeAskApi } from '@/test/fakeAskApi';
import type { UserEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';

function LocationProbe(): ReactElement {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function renderAsk(): UserEvent {
  const user: UserEvent = userEvent.setup();
  const client: QueryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/ask']}>
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

async function ask(user: UserEvent, question: string): Promise<void> {
  await user.type(screen.getByLabelText('Your question'), question);
  await user.click(screen.getByRole('button', { name: 'Ask' }));
}

describe('AskPage', (): void => {
  let api: ApiMock;
  let server: FakeAskApi;

  beforeEach((): void => {
    api = installApiMock();
    server = installFakeAskApi(api);
  });

  afterEach((): void => {
    api.restore();
  });

  function asks(): number {
    return api.callsTo('/ask').filter((call): boolean => call.init?.method === 'POST').length;
  }

  it('asks for a question instead of calling the API when the box is empty', async (): Promise<void> => {
    const user: UserEvent = renderAsk();
    await user.click(screen.getByRole('button', { name: 'Ask' }));

    expect(screen.getByText('Type a question first.')).toBeInTheDocument();
    expect(asks()).toBe(0);
  });

  it('rejects a question over 1000 characters without calling the API', async (): Promise<void> => {
    const user: UserEvent = renderAsk();
    await user.click(screen.getByLabelText('Your question'));
    await user.paste('a'.repeat(1001));
    await user.click(screen.getByRole('button', { name: 'Ask' }));

    expect(screen.getByText('Keep it under 1000 characters.')).toBeInTheDocument();
    expect(asks()).toBe(0);
  });

  it('saves the answer, opens it at its own URL and adds it to the history list', async (): Promise<void> => {
    const user: UserEvent = renderAsk();
    await ask(user, '  Which projects use GRM188?  ');

    const answer: HTMLElement = await screen.findByRole('region', { name: 'Answer' });
    expect(screen.getByTestId('location')).toHaveTextContent('/ask/1');
    expect(answer).toHaveTextContent('GRM188 is used in Alpha and Beta.');
    expect(answer).toHaveTextContent('Looked up: Checked part usage');
    // The question is shown exactly as it was sent (trimmed), above the answer.
    expect(screen.getByRole('region', { name: 'Your question' })).toHaveTextContent('Which projects use GRM188?');

    const table: HTMLElement = screen.getByRole('region', { name: 'Matching parts' });
    expect(within(table).getByText(/2 parts found/)).toBeInTheDocument();
    expect(within(table).getAllByText('GRM188R71H104KA93D')).toHaveLength(2);

    const sent: unknown = JSON.parse(String(api.callsTo('/ask').find((c): boolean => c.init?.method === 'POST')?.init?.body));
    expect(sent).toEqual({ question: 'Which projects use GRM188?' });
    expect(await within(screen.getByRole('navigation', { name: 'Your previous questions' })).findByText('Which projects use GRM188?')).toBeInTheDocument();
  });

  it('opens the saved copy without asking the model a second time', async (): Promise<void> => {
    const user: UserEvent = renderAsk();
    await ask(user, 'once only');
    await screen.findByRole('region', { name: 'Answer' });

    expect(asks()).toBe(1);
    // Cached from the ask: not even a GET for the entry was needed.
    expect(api.callsTo('/ask/history/1')).toHaveLength(0);
  });

  it('says when the part list is partial', async (): Promise<void> => {
    server.reply.truncated = true;
    const user: UserEvent = renderAsk();
    await ask(user, 'q');

    expect(await screen.findByText(/this list is partial/)).toBeInTheDocument();
  });

  it('shows only the answer when no parts came back', async (): Promise<void> => {
    server.reply = { answer: 'I found nothing for that.', parts: [], truncated: false, tools: ['search_parts'] };
    const user: UserEvent = renderAsk();
    await ask(user, 'q');

    expect(await screen.findByRole('region', { name: 'Answer' })).toHaveTextContent('I found nothing for that.');
    expect(screen.queryByRole('region', { name: 'Matching parts' })).not.toBeInTheDocument();
  });

  it('renders the answer as text, never as HTML', async (): Promise<void> => {
    server.reply = { answer: '<img src=x alt="pwned"> hello', parts: [], truncated: false, tools: [] };
    const user: UserEvent = renderAsk();
    await ask(user, 'q');

    expect(await screen.findByText('<img src=x alt="pwned"> hello')).toBeInTheDocument();
    expect(screen.queryByAltText('pwned')).not.toBeInTheDocument();
  });

  it('submits with Ctrl+Enter', async (): Promise<void> => {
    const user: UserEvent = renderAsk();
    await user.type(screen.getByLabelText('Your question'), 'quick{Control>}{Enter}{/Control}');

    expect(await screen.findByRole('region', { name: 'Answer' })).toBeInTheDocument();
    expect(asks()).toBe(1);
  });

  it('fills the box from an example without sending it', async (): Promise<void> => {
    const user: UserEvent = renderAsk();
    await user.click(screen.getByRole('button', { name: 'List the 0402 capacitors' }));

    expect(screen.getByLabelText('Your question')).toHaveValue('List the 0402 capacitors');
    expect(asks()).toBe(0);
  });

  it('explains when the assistant is not enabled on the server (route missing)', async (): Promise<void> => {
    api.on('POST', '/ask', (): Response => jsonResponse({ error: '404 page not found' }, 404));
    const user: UserEvent = renderAsk();
    await ask(user, 'q');

    expect(await screen.findByRole('alert')).toHaveTextContent('The AI assistant is not enabled on this server.');
  });

  it('shows the server message and saves nothing when the assistant fails', async (): Promise<void> => {
    api.on('POST', '/ask', (): Response => jsonResponse({ error: 'The assistant took too long' }, 504));
    const user: UserEvent = renderAsk();
    await ask(user, 'q');

    expect(await screen.findByRole('alert')).toHaveTextContent('The assistant took too long');
    expect(screen.queryByRole('region', { name: 'Answer' })).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/ask');
    expect(server.entries).toHaveLength(0);
  });

  it('still shows the answer, with a warning, when it could not be saved', async (): Promise<void> => {
    server.failSaving = true;
    const user: UserEvent = renderAsk();
    await ask(user, 'q');

    expect(await screen.findByRole('region', { name: 'Answer' })).toHaveTextContent('GRM188 is used in Alpha and Beta.');
    expect(screen.getByRole('alert')).toHaveTextContent('could not be saved to your history');
    // Nothing to reopen later, so it stays on the form page.
    expect(screen.getByTestId('location')).toHaveTextContent('/ask');
    expect(screen.getByTestId('location')).not.toHaveTextContent('/ask/');
  });

  it('disables asking again while a question is in flight', async (): Promise<void> => {
    let release: () => void = (): void => undefined;
    const gate: Promise<void> = new Promise<void>((resolve: () => void): void => {
      release = resolve;
    });
    const original: Response = jsonResponse({ id: '1', question: 'q', answer: 'done', parts: [], parts_truncated: false, tools_used: [], created_at: '2026-11-08T10:30:00Z' });
    api.on('POST', '/ask', (): Promise<Response> => gate.then((): Response => original));
    const user: UserEvent = renderAsk();
    await ask(user, 'q');

    expect(await screen.findByRole('status')).toHaveTextContent('Searching your parts');
    await user.click(screen.getByRole('button', { name: 'Looking it up…' }));
    expect(asks()).toBe(1);

    release();
    expect(await screen.findByRole('region', { name: 'Answer' })).toBeInTheDocument();
  });
});
