import { getToken } from '@/lib/auth/tokenStorage';

const API_URL: string = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api').replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  params?: URLSearchParams;
  /** Attach the bearer token. Defaults to true; login turns it off. */
  auth?: boolean;
  signal?: AbortSignal;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload) && typeof payload.error === 'string') return payload.error;
  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  const text: string = await response.text();
  if (text === '') return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * Performs a request and returns the decoded JSON as `unknown`; callers narrow it
 * with a type guard so a backend contract change fails loudly instead of silently.
 */
export async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  const { method = 'GET', body, params, auth = true, signal } = options;

  const query: string = params && params.size > 0 ? `?${params.toString()}` : '';
  const headers: Headers = new Headers({ Accept: 'application/json' });
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const token: string | null = auth ? getToken() : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}${query}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }

  const payload: unknown = await readJson(response);
  if (!response.ok) {
    throw new ApiError(response.status, extractErrorMessage(payload, `Request failed (${response.status})`));
  }
  return payload;
}
