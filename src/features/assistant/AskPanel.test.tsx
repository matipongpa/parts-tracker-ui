import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AskPanel } from '@/features/assistant/AskPanel';
import { installApiMock, jsonResponse } from '@/test/apiMock';
import { installFakeAskApi } from '@/test/fakeAskApi';
import type { ApiMock } from '@/test/apiMock';
import type { FakeAskApi } from '@/test/fakeAskApi';
import type { UserEvent } from '@testing-library/user-event';

function renderAsk(open: boolean = true, onClose: () => void = (): void => undefined): UserEvent {
  const user: UserEvent = userEvent.setup();
  const client: QueryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AskPanel open={open} onClose={onClose} />
    </QueryClientProvider>,
  );
  return user;
}

async function ask(user: UserEvent, question: string): Promise<void> {
  await user.type(screen.getByLabelText('Your question'), question);
  await user.click(screen.getByRole('button', { name: 'Ask' }));
}

describe('AskPanel', (): void => {
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

  it('saves the answer, shows it from the saved copy and adds it to the history list', async (): Promise<void> => {
    const user: UserEvent = renderAsk();
    await ask(user, '  Which projects use GRM188?  ');

    const answer: HTMLElement = await screen.findByRole('region', { name: 'Answer' });
    expect(answer).toHaveTextContent('GRM188 is used in Alpha and Beta.');
    expect(answer).toHaveTextContent('Looked up: Checked part usage');
    // The question is shown exactly as it was sent (trimmed), above the answer.
    expect(screen.getByRole('region', { name: 'Your question' })).toHaveTextContent('Which projects use GRM188?');

    const table: HTMLElement = screen.getByRole('region', { name: 'Matching parts' });
    expect(within(table).getByText(/2 parts found/)).toBeInTheDocument();
    expect(within(table).getAllByText('GRM188R71H104KA93D')).toHaveLength(2);

    const sent: unknown = JSON.parse(String(api.callsTo('/ask').find((c): boolean => c.init?.method === 'POST')?.init?.body));
    expect(sent).toEqual({ question: 'Which projects use GRM188?' });
    await user.click(screen.getByRole('button', { name: 'Previous questions' }));
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
    expect(server.entries).toHaveLength(0);
  });

  it('still shows the answer, with a warning, when it could not be saved', async (): Promise<void> => {
    server.failSaving = true;
    const user: UserEvent = renderAsk();
    await ask(user, 'q');

    expect(await screen.findByRole('region', { name: 'Answer' })).toHaveTextContent('GRM188 is used in Alpha and Beta.');
    expect(screen.getByRole('alert')).toHaveTextContent('could not be saved to your history');
    // Nothing to reopen later, so it stays in the form instead of switching to a saved entry.
    expect(screen.getByRole('textbox', { name: 'Your question' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'New question' })).not.toBeInTheDocument();
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

  it('keeps the draft when you look at the history and come back', async (): Promise<void> => {
    const user: UserEvent = renderAsk();
    await user.type(screen.getByLabelText('Your question'), 'half typed');
    await user.click(screen.getByRole('button', { name: 'Previous questions' }));
    await user.click(screen.getByRole('button', { name: 'Previous questions' }));

    expect(screen.getByLabelText('Your question')).toHaveValue('half typed');
  });

  it('clears the box after the answer is saved, so a new question starts empty', async (): Promise<void> => {
    const user: UserEvent = renderAsk();
    await ask(user, 'first');
    await screen.findByRole('region', { name: 'Answer' });
    await user.click(screen.getByRole('button', { name: 'Ask a new question' }));

    expect(screen.getByLabelText('Your question')).toHaveValue('');
  });

  function widthOf(): string {
    return screen.getByRole('complementary', { name: 'Ask AI' }).style.getPropertyValue('--ask-w');
  }

  it('widens and narrows with the button, and remembers the width', async (): Promise<void> => {
    const user: UserEvent = renderAsk();
    expect(widthOf()).toBe('448px');

    await user.click(screen.getByRole('button', { name: 'Make Ask AI wider' }));
    // jsdom's window is 1024 wide, so the 1152 target is held back to leave a strip of the page.
    expect(widthOf()).toBe('976px');
    expect(localStorage.getItem('ask-panel-width')).toBe('976');

    // A fresh mount (a page reload) starts at the saved width.
    cleanup();
    renderAsk();
    expect(widthOf()).toBe('976px');

    await user.click(screen.getByRole('button', { name: 'Make Ask AI narrower' }));
    expect(widthOf()).toBe('448px');
    expect(localStorage.getItem('ask-panel-width')).toBe('448');
  });

  it('resizes with the arrow keys and stops at the limits', async (): Promise<void> => {
    const user: UserEvent = renderAsk();
    const handle: HTMLElement = screen.getByRole('separator', { name: 'Resize Ask AI' });
    handle.focus();

    await user.keyboard('{ArrowLeft}');
    expect(widthOf()).toBe('472px');
    expect(handle).toHaveAttribute('aria-valuenow', '472');
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(widthOf()).toBe('384px');
    await user.keyboard('{End}');
    expect(widthOf()).toBe('976px');
    await user.keyboard('{Home}');
    expect(widthOf()).toBe('384px');
    expect(localStorage.getItem('ask-panel-width')).toBe('384');
  });

  it('follows the mouse while dragging the left edge and saves the width when released', async (): Promise<void> => {
    const user: UserEvent = renderAsk();
    const handle: HTMLElement = screen.getByRole('separator', { name: 'Resize Ask AI' });

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { clientX: 600 } },
      { coords: { clientX: 500 } },
    ]);
    // Dragging 100px to the left makes the panel 100px wider; nothing is stored yet.
    expect(widthOf()).toBe('548px');
    expect(localStorage.getItem('ask-panel-width')).toBeNull();

    await user.pointer([{ coords: { clientX: 450 } }, { keys: '[/MouseLeft]' }]);
    expect(widthOf()).toBe('598px');
    expect(localStorage.getItem('ask-panel-width')).toBe('598');

    // Moving the mouse after the button is up does nothing.
    await user.pointer({ coords: { clientX: 100 } });
    expect(widthOf()).toBe('598px');
  });

  it('never drags narrower than the minimum', async (): Promise<void> => {
    const user: UserEvent = renderAsk();
    const handle: HTMLElement = screen.getByRole('separator', { name: 'Resize Ask AI' });

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { clientX: 100 } },
      { coords: { clientX: 900 } },
      { keys: '[/MouseLeft]' },
    ]);
    expect(widthOf()).toBe('384px');
  });

  it('closes on Escape and from the close button', async (): Promise<void> => {
    let closed: number = 0;
    const user: UserEvent = renderAsk(true, (): void => {
      closed += 1;
    });
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Close Ask AI' }));

    expect(closed).toBe(2);
  });

  it('is inert (out of the tab order) while closed', (): void => {
    renderAsk(false);

    expect(screen.getByLabelText('Ask AI', { selector: 'aside' })).toHaveAttribute('inert');
  });
});
