import { API_URL } from '@/lib/api/config';
import { ApiError, networkError } from '@/lib/api/errors';
import { isRecord } from '@/lib/api/guards';
import { getAccessToken, refreshAccessToken } from '@/lib/api/session';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  /** JSON-encoded unless it is a FormData, which is sent as multipart and gets its boundary from the browser. */
  body?: unknown;
  params?: URLSearchParams;
  /** Attach the bearer token, and on a 401 refresh it once and retry. Defaults to true; login turns it off. */
  auth?: boolean;
  /** Send and accept cookies (the httpOnly refresh cookie). Only the login and logout calls need it. */
  withCookies?: boolean;
  signal?: AbortSignal;
}

interface Reply {
  response: Response;
  payload: unknown;
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

async function send(path: string, options: RequestOptions, token: string | null): Promise<Reply> {
  const { method = 'GET', body, params, withCookies = false, signal } = options;

  const query: string = params && params.size > 0 ? `?${params.toString()}` : '';
  const headers: Headers = new Headers({ Accept: 'application/json' });
  const isForm: boolean = body instanceof FormData;
  // For multipart, never set Content-Type by hand: fetch adds it with the boundary.
  if (body !== undefined && !isForm) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}${query}`, {
      method,
      headers,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      credentials: withCookies ? 'include' : 'same-origin',
      signal,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw networkError();
  }
  return { response, payload: await readJson(response) };
}

function unwrap({ response, payload }: Reply): unknown {
  if (!response.ok) {
    throw new ApiError(response.status, extractErrorMessage(payload, `Request failed (${response.status})`));
  }
  return payload;
}

/**
 * Performs a request and returns the decoded JSON as `unknown`; callers narrow it
 * with a type guard so a backend contract change fails loudly instead of silently.
 */
export async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  const { auth = true } = options;

  let reply: Reply = await send(path, options, auth ? getAccessToken() : null);
  if (auth && reply.response.status === 401) {
    // The access token only lives for minutes and is gone after a reload: trade the refresh
    // cookie for a new one and replay the request once. If that fails the 401 stands.
    const fresh: string | null = await refreshAccessToken();
    if (fresh !== null) reply = await send(path, options, fresh);
  }
  return unwrap(reply);
}
