import { QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError, isUnauthorized } from '@/lib/api/client';
import { clearToken } from '@/lib/auth/tokenStorage';

/** Retry flaky network/5xx failures a couple of times, but never 4xx (they won't fix themselves). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      // Token expired or revoked: dropping it flips AuthProvider, and ProtectedRoute redirects to /login.
      onError: (error: unknown): void => {
        if (isUnauthorized(error)) clearToken();
      },
    }),
    defaultOptions: {
      // The server caches searches too, so short client-side freshness is plenty.
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: shouldRetry },
    },
  });
}
