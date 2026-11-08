import { ApiError, request } from '@/lib/api/client';
import type { LoginCredentials, LoginResponse, RegisterInput } from '@/lib/types';

function isLoginResponse(value: unknown): value is LoginResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'token' in value &&
    typeof value.token === 'string' &&
    value.token !== ''
  );
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const payload: unknown = await request('/login', { method: 'POST', body: credentials, auth: false });
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
