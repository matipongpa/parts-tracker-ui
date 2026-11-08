import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from '@/features/auth/LoginPage';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { getToken } from '@/lib/auth/tokenStorage';
import type { UserEvent } from '@testing-library/user-event';
import type { Location } from 'react-router-dom';
import type { Mock } from 'vitest';
import type { ReactElement } from 'react';

function renderLogin(initialEntry: string | { pathname: string; state: unknown } = '/login'): UserEvent {
  const user: UserEvent = userEvent.setup();
  const tree: ReactElement = (
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/parts" element={<PartsProbe />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
  render(tree);
  return user;
}

/** Stand-in for the parts route that exposes the query string it was reached with. */
function PartsProbe(): ReactElement {
  const location: Location = useLocation();
  return <h1>Parts page{location.search}</h1>;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('LoginPage', (): void => {
  let fetchMock: Mock<typeof fetch>;

  beforeEach((): void => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('validates required fields without calling the API', async (): Promise<void> => {
    const user: UserEvent = renderLogin();
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('Enter your username.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stays on the page and shows the server message when credentials are rejected', async (): Promise<void> => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Invalid username or password' }, 401));
    const user: UserEvent = renderLogin();

    await user.type(screen.getByLabelText('Username'), 'ati');
    await user.type(screen.getByLabelText('Password'), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password');
    expect(getToken()).toBeNull();
    expect(screen.queryByText('Parts page')).not.toBeInTheDocument();
  });

  it('stores the token and navigates to /parts on success', async (): Promise<void> => {
    fetchMock.mockResolvedValue(jsonResponse({ token: 'jwt-abc' }, 200));
    const user: UserEvent = renderLogin();

    await user.type(screen.getByLabelText('Username'), 'ati');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Parts page')).toBeInTheDocument();
    expect(getToken()).toBe('jwt-abc');

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({ username: 'ati', password: 'correct-horse' });
    expect((init?.headers as Headers).has('Authorization')).toBe(false);
  });

  it('returns to the originally requested URL, including its filters', async (): Promise<void> => {
    fetchMock.mockResolvedValue(jsonResponse({ token: 'jwt-abc' }, 200));
    const user: UserEvent = renderLogin({
      pathname: '/login',
      state: { from: { pathname: '/parts', search: '?type=Diode&page=2' } },
    });

    await user.type(screen.getByLabelText('Username'), 'ati');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Parts page?type=Diode&page=2')).toBeInTheDocument();
  });
});
