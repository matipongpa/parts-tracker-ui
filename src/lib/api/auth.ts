import { ApiError, request } from '@/lib/api/client';
import type { LoginCredentials, LoginResponse } from '@/lib/types';

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
