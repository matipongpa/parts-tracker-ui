import { API_URL } from '@/lib/api/config';
import { ApiError, networkError } from '@/lib/api/errors';
import { isRecord } from '@/lib/api/guards';

// The access token lives in this module's memory only: nothing in localStorage or a
// JS-readable cookie, so an XSS payload cannot copy it out of storage. The long-lived
// credential is the httpOnly refresh cookie, which the browser sends to /auth/refresh
// by itself and page scripts cannot read at all.

type Listener = () => void;

const listeners: Set<Listener> = new Set<Listener>();
let accessToken: string | null = null;
/** Bumped on every clearSession, so a refresh that was already in flight cannot resurrect a logged-out session. */
let epoch: number = 0;
let inflightRefresh: Promise<string | null> | null = null;

function notify(): void {
  listeners.forEach((listener: Listener): void => listener());
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
  notify();
}

/** Forgets the in-memory token. It does not touch the cookie; that needs the server (see logout). */
export function clearSession(): void {
  epoch += 1;
  accessToken = null;
  notify();
}

export function subscribeToken(listener: Listener): () => void {
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

function readToken(payload: unknown): string | null {
  return isRecord(payload) && typeof payload.token === 'string' && payload.token !== '' ? payload.token : null;
}

async function requestRefresh(): Promise<string | null> {
  const startedAt: number = epoch;

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    });
  } catch {
    throw networkError();
  }

  // No cookie, or it expired or was revoked: the session is over and the user must log in.
  if (response.status === 401) {
    clearSession();
    return null;
  }
  if (!response.ok) throw new ApiError(response.status, `Request failed (${response.status})`);

  const token: string | null = readToken(await response.json().catch((): null => null));
  if (token === null) throw new ApiError(502, 'Unexpected response from the server.');
  if (epoch !== startedAt) return null; // logged out while this was in flight
  setAccessToken(token);
  return token;
}

/**
 * Trades the refresh cookie for a new access token and stores it. Resolves to `null` when
 * there is no valid session, and rejects on network or server failures, which say nothing
 * about the session. Concurrent callers (StrictMode's double effect, several requests
 * expiring at once) share one request.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (inflightRefresh === null) {
    inflightRefresh = requestRefresh().finally((): void => {
      inflightRefresh = null;
    });
  }
  return inflightRefresh;
}

/** Earlier versions kept the JWT in localStorage; delete that copy so it cannot be lifted by a script. */
export function purgeLegacyToken(): void {
  try {
    localStorage.removeItem('token');
  } catch {
    // Storage can throw (private mode, blocked site data); there is nothing to purge then.
  }
}
