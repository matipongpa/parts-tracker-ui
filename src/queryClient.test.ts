import { afterEach, describe, expect, it } from 'vitest';

import { createQueryClient } from '@/queryClient';
import { clearSession, setAccessToken } from '@/lib/api/session';
import type { QueryClient } from '@tanstack/react-query';

describe('createQueryClient', (): void => {
  afterEach((): void => {
    clearSession();
  });

  it('forgets cached data when the session ends, so the next user cannot see it', (): void => {
    const client: QueryClient = createQueryClient();
    setAccessToken('alice-token');
    client.setQueryData(['ask-history', 'list'], [{ id: '1', question: 'alice only' }]);

    clearSession();

    expect(client.getQueryData(['ask-history', 'list'])).toBeUndefined();
  });

  it('keeps cached data while the user stays signed in', (): void => {
    const client: QueryClient = createQueryClient();
    setAccessToken('alice-token');
    client.setQueryData(['ask-history', 'list'], [{ id: '1' }]);

    setAccessToken('alice-token-refreshed');

    expect(client.getQueryData(['ask-history', 'list'])).toEqual([{ id: '1' }]);
  });
});
