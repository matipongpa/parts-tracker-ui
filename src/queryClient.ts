import { QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError, isUnauthorized } from '@/lib/api/errors';
import { clearSession, getAccessToken, subscribeToken } from '@/lib/api/session';

/** Retry flaky network/5xx failures a couple of times, but never 4xx (they won't fix themselves). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      // request() already tried to refresh once, so a 401 here means the session is over: dropping the
      // in-memory token flips AuthProvider, and ProtectedRoute redirects to /login.
      onError: (error: unknown): void => {
        if (isUnauthorized(error)) clearSession();
      },
    }),
    defaultOptions: {
      // The server caches searches too, so short client-side freshness is plenty.
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: shouldRetry },
    },
  });

  // Some cached data is private to a user (saved AI questions). Whenever the session ends, by logout or
  // an expired cookie, forget all of it so the next person to log in on this tab cannot see it.
  subscribeToken((): void => {
    if (getAccessToken() === null) client.clear();
  });
  return client;
}
