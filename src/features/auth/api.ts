import { request } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { isRecord } from '@/lib/api/guards';
import type { LoginCredentials, LoginResponse, RegisterInput } from '@/features/auth/types';

function isLoginResponse(value: unknown): value is LoginResponse {
  return isRecord(value) && typeof value.token === 'string' && value.token !== '';
}

/** Returns the access token; the backend also sets the httpOnly refresh cookie, which needs `withCookies`. */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const payload: unknown = await request('/login', { method: 'POST', body: credentials, auth: false, withCookies: true });
  if (!isLoginResponse(payload)) throw new ApiError(502, 'Unexpected response from the server.');
  return payload;
}

/** Creates an account. The backend replies with a message only, so the caller logs in afterwards. */
export async function register(input: RegisterInput): Promise<void> {
  await request('/register', {
    method: 'POST',
    // Key names follow the backend's JSON contract (all lower case).
    body: {
      username: input.username,
      password: input.password,
      firstname: input.firstName,
      surname: input.surname,
      invitecode: input.inviteCode,
    },
    auth: false,
  });
}

/** Asks the server to drop the refresh cookie; page scripts cannot delete an httpOnly cookie themselves. */
export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST', auth: false, withCookies: true });
}
