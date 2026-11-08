import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LoginPage } from '@/features/auth/LoginPage';
import { AuthProvider } from '@/features/auth/AuthContext';
import { getAccessToken } from '@/lib/api/session';
import { installApiMock, jsonResponse } from '@/test/apiMock';
import type { ApiMock } from '@/test/apiMock';
import type { UserEvent } from '@testing-library/user-event';
import type { Location } from 'react-router-dom';
import type { ReactElement } from 'react';

async function renderLogin(initialEntry: string | { pathname: string; state: unknown } = '/login'): Promise<UserEvent> {
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
  // The page shows a spinner until the session restore settles; wait for the form.
  await screen.findByRole('button', { name: 'Log in' });
  return user;
}

/** Stand-in for the parts route that exposes the query string it was reached with. */
function PartsProbe(): ReactElement {
  const location: Location = useLocation();
  return <h1>Parts page{location.search}</h1>;
}

describe('LoginPage', (): void => {
  let api: ApiMock;

  beforeEach((): void => {
    api = installApiMock();
  });

  afterEach((): void => {
    api.restore();
  });

  it('validates required fields without calling the API', async (): Promise<void> => {
    const user: UserEvent = await renderLogin();
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('Enter your username.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(api.callsTo('/login')).toHaveLength(0);
  });

  it('stays on the page and shows the server message when credentials are rejected', async (): Promise<void> => {
    api.on('POST', '/login', (): Response => jsonResponse({ error: 'Invalid username or password' }, 401));
    const user: UserEvent = await renderLogin();

    await user.type(screen.getByLabelText('Username'), 'ati');
    await user.type(screen.getByLabelText('Password'), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password');
    expect(getAccessToken()).toBeNull();
    expect(screen.queryByText('Parts page')).not.toBeInTheDocument();
  });

  it('stores the token and navigates to /parts on success', async (): Promise<void> => {
    api.on('POST', '/login', (): Response => jsonResponse({ token: 'jwt-abc' }, 200));
    const user: UserEvent = await renderLogin();

    await user.type(screen.getByLabelText('Username'), 'ati');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Parts page')).toBeInTheDocument();
    expect(getAccessToken()).toBe('jwt-abc');

    const init: RequestInit | undefined = api.callsTo('/login')[0]?.init;
    expect(JSON.parse(String(init?.body))).toEqual({ username: 'ati', password: 'correct-horse' });
    expect((init?.headers as Headers).has('Authorization')).toBe(false);
    // Without this the browser would ignore the Set-Cookie that carries the refresh token.
    expect(init?.credentials).toBe('include');
    expect(localStorage.length).toBe(0);
  });

  it('returns to the originally requested URL, including its filters', async (): Promise<void> => {
    api.on('POST', '/login', (): Response => jsonResponse({ token: 'jwt-abc' }, 200));
    const user: UserEvent = await renderLogin({
      pathname: '/login',
      state: { from: { pathname: '/parts', search: '?type=Diode&page=2' } },
    });

    await user.type(screen.getByLabelText('Username'), 'ati');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Parts page?type=Diode&page=2')).toBeInTheDocument();
  });

  it('skips the form and goes straight to /parts when the refresh cookie restores the session', async (): Promise<void> => {
    api.on('POST', '/auth/refresh', (): Response => jsonResponse({ token: 'jwt-restored' }, 200));
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/parts" element={<PartsProbe />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Parts page')).toBeInTheDocument();
    expect(getAccessToken()).toBe('jwt-restored');
    expect(api.callsTo('/login')).toHaveLength(0);
  });
});
