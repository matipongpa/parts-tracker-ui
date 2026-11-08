import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { getAccessToken } from '@/lib/api/session';
import { installApiMock, jsonResponse } from '@/test/apiMock';
import type { ApiMock } from '@/test/apiMock';
import type { UserEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';

function LogoutButton(): ReactElement {
  const { logout } = useAuth();
  return (
    <button type="button" onClick={(): void => void logout().catch((): void => undefined)}>
      Log out
    </button>
  );
}

function renderApp(): void {
  render(
    <MemoryRouter initialEntries={['/parts']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<h1>Login page</h1>} />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/parts"
              element={
                <>
                  <h1>Parts page</h1>
                  <LogoutButton />
                </>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('session restore on reload', (): void => {
  let api: ApiMock;

  beforeEach((): void => {
    api = installApiMock();
  });

  afterEach((): void => {
    api.restore();
  });

  it('shows a loading state, then the page, when the refresh cookie is valid', async (): Promise<void> => {
    api.on('POST', '/auth/refresh', (): Response => jsonResponse({ token: 'jwt-restored' }));
    renderApp();

    expect(screen.getByRole('status')).toHaveTextContent('Restoring your session');
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    expect(await screen.findByText('Parts page')).toBeInTheDocument();
    expect(getAccessToken()).toBe('jwt-restored');
  });

  it('redirects to /login when there is no valid cookie', async (): Promise<void> => {
    renderApp();
    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Parts page')).not.toBeInTheDocument();
  });

  it('redirects to /login when the server cannot be reached', async (): Promise<void> => {
    api.fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderApp();
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });
});

describe('logout', (): void => {
  let api: ApiMock;

  beforeEach((): void => {
    api = installApiMock();
    api.on('POST', '/auth/refresh', (): Response => jsonResponse({ token: 'jwt-restored' }));
  });

  afterEach((): void => {
    api.restore();
  });

  it('has the server drop the cookie, then forgets the token and leaves the page', async (): Promise<void> => {
    api.on('POST', '/auth/logout', (): Response => new Response(null, { status: 204 }));
    const user: UserEvent = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(api.callsTo('/auth/logout')[0]?.init?.credentials).toBe('include');
    expect(getAccessToken()).toBeNull();
  });

  it('stays signed in when the server could not be told, because the cookie would still be live', async (): Promise<void> => {
    api.on('POST', '/auth/logout', (): Response => jsonResponse({ error: 'boom' }, 500));
    const user: UserEvent = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(await screen.findByText('Parts page')).toBeInTheDocument();
    expect(getAccessToken()).toBe('jwt-restored');
  });
});
