import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RegisterPage } from '@/features/auth/RegisterPage';
import { AuthProvider } from '@/features/auth/AuthContext';
import { getAccessToken } from '@/lib/api/session';
import { installApiMock, jsonResponse } from '@/test/apiMock';
import type { ApiMock } from '@/test/apiMock';
import type { UserEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';

interface FormOverrides {
  password?: string;
  confirm?: string;
  code?: string;
}

async function renderRegister(): Promise<UserEvent> {
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
  // The page shows a spinner until the session restore settles; wait for the form.
  await screen.findByRole('button', { name: 'Create account' });
  return user;
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
  let api: ApiMock;

  beforeEach((): void => {
    api = installApiMock();
  });

  afterEach((): void => {
    api.restore();
  });

  it('validates the form without calling the API', async (): Promise<void> => {
    const user: UserEvent = await renderRegister();
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.type(screen.getByLabelText('Confirm password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Choose a username.')).toBeInTheDocument();
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(screen.getByText('Enter the invite code from your team.')).toBeInTheDocument();
    expect(api.callsTo('/register')).toHaveLength(0);
  });

  it('rejects a password over the 72-byte bcrypt limit', async (): Promise<void> => {
    const user: UserEvent = await renderRegister();
    const tooLong: string = 'a'.repeat(73);
    await fillForm(user, { password: tooLong, confirm: tooLong });
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Use at most 72 bytes.')).toBeInTheDocument();
    expect(api.callsTo('/register')).toHaveLength(0);
  });

  it('registers, logs in and lands on /parts', async (): Promise<void> => {
    api.on('POST', '/register', (): Response => jsonResponse({ message: 'User registered successfully' }, 200));
    api.on('POST', '/login', (): Response => jsonResponse({ token: 'jwt-new' }, 200));
    const user: UserEvent = await renderRegister();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Parts page')).toBeInTheDocument();
    expect(getAccessToken()).toBe('jwt-new');

    const registerInit: RequestInit | undefined = api.callsTo('/register')[0]?.init;
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
    api.on('POST', '/register', (): Response => jsonResponse({ error: 'Invalid invite code' }, 403));
    const user: UserEvent = await renderRegister();
    await fillForm(user, { code: 'nope' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Invalid invite code')).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
    expect(api.callsTo('/register')).toHaveLength(1);
    expect(api.callsTo('/login')).toHaveLength(0);
  });

  it('flags a taken username on the username field', async (): Promise<void> => {
    api.on('POST', '/register', (): Response => jsonResponse({ error: 'Username already taken' }, 409));
    const user: UserEvent = await renderRegister();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('That username is already taken.')).toBeInTheDocument();
    expect(screen.queryByText('Parts page')).not.toBeInTheDocument();
  });

  it('sends the user to /login when the account was created but the follow-up login fails', async (): Promise<void> => {
    api.on('POST', '/register', (): Response => jsonResponse({ message: 'ok' }, 200));
    api.on('POST', '/login', (): Response => jsonResponse({ error: 'boom' }, 500));
    const user: UserEvent = await renderRegister();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });
});
