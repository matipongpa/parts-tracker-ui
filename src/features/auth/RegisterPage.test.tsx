import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RegisterPage } from '@/features/auth/RegisterPage';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { getToken } from '@/lib/auth/tokenStorage';
import type { UserEvent } from '@testing-library/user-event';
import type { Mock } from 'vitest';
import type { ReactElement } from 'react';

interface FormOverrides {
  password?: string;
  confirm?: string;
  code?: string;
}

function renderRegister(): UserEvent {
  const user: UserEvent = userEvent.setup();
  const tree: ReactElement = (
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<h1>Login page</h1>} />
          <Route path="/parts" element={<h1>Parts page</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
  render(tree);
  return user;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function fillForm(user: UserEvent, overrides: FormOverrides = {}): Promise<void> {
  await user.type(screen.getByLabelText('First name'), 'Ati');
  await user.type(screen.getByLabelText('Surname'), 'P');
  await user.type(screen.getByLabelText('Username'), 'ati');
  await user.type(screen.getByLabelText('Password'), overrides.password ?? 'correct-horse');
  await user.type(screen.getByLabelText('Confirm password'), overrides.confirm ?? 'correct-horse');
  await user.type(screen.getByLabelText('Invite code'), overrides.code ?? 'team-invite');
}

describe('RegisterPage', (): void => {
  let fetchMock: Mock<typeof fetch>;

  beforeEach((): void => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('validates the form without calling the API', async (): Promise<void> => {
    const user: UserEvent = renderRegister();
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.type(screen.getByLabelText('Confirm password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Choose a username.')).toBeInTheDocument();
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(screen.getByText('Enter the invite code from your team.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a password over the 72-byte bcrypt limit', async (): Promise<void> => {
    const user: UserEvent = renderRegister();
    const tooLong: string = 'a'.repeat(73);
    await fillForm(user, { password: tooLong, confirm: tooLong });
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Use at most 72 bytes.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('registers, logs in and lands on /parts', async (): Promise<void> => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'User registered successfully' }, 200))
      .mockResolvedValueOnce(jsonResponse({ token: 'jwt-new' }, 200));
    const user: UserEvent = renderRegister();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Parts page')).toBeInTheDocument();
    expect(getToken()).toBe('jwt-new');

    const [registerUrl, registerInit] = fetchMock.mock.calls[0] ?? [];
    expect(String(registerUrl)).toMatch(/\/register$/);
    expect(JSON.parse(String(registerInit?.body))).toEqual({
      username: 'ati',
      password: 'correct-horse',
      firstname: 'Ati',
      surname: 'P',
      invitecode: 'team-invite',
    });
    expect((registerInit?.headers as Headers).has('Authorization')).toBe(false);
  });

  it('shows a wrong invite code on its field and stores no token', async (): Promise<void> => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Invalid invite code' }, 403));
    const user: UserEvent = renderRegister();
    await fillForm(user, { code: 'nope' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Invalid invite code')).toBeInTheDocument();
    expect(getToken()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('flags a taken username on the username field', async (): Promise<void> => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Username already taken' }, 409));
    const user: UserEvent = renderRegister();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('That username is already taken.')).toBeInTheDocument();
    expect(screen.queryByText('Parts page')).not.toBeInTheDocument();
  });

  it('sends the user to /login when the account was created but the follow-up login fails', async (): Promise<void> => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'ok' }, 200))
      .mockResolvedValueOnce(jsonResponse({ error: 'boom' }, 500));
    const user: UserEvent = renderRegister();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });
});
