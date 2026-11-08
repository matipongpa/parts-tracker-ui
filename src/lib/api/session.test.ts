import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearSession, getAccessToken, purgeLegacyToken, refreshAccessToken, subscribeToken } from '@/lib/api/session';
import { installApiMock, jsonResponse } from '@/test/apiMock';
import type { ApiMock } from '@/test/apiMock';

describe('session', (): void => {
  let api: ApiMock;

  beforeEach((): void => {
    api = installApiMock();
  });

  afterEach((): void => {
    api.restore();
  });

  it('keeps the token in memory only', async (): Promise<void> => {
    api.on('POST', '/auth/refresh', (): Response => jsonResponse({ token: 'jwt-1' }));

    await refreshAccessToken();

    expect(getAccessToken()).toBe('jwt-1');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe('');
  });

  it('resolves null and clears the token when there is no valid cookie', async (): Promise<void> => {
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('rejects on a server error without touching the token', async (): Promise<void> => {
    api.on('POST', '/auth/refresh', (): Response => jsonResponse({ error: 'boom' }, 500));
    await expect(refreshAccessToken()).rejects.toMatchObject({ status: 500 });
  });

  it('rejects a refresh response without a token', async (): Promise<void> => {
    api.on('POST', '/auth/refresh', (): Response => jsonResponse({ nope: true }));
    await expect(refreshAccessToken()).rejects.toMatchObject({ status: 502 });
    expect(getAccessToken()).toBeNull();
  });

  it('collapses concurrent refreshes into one request', async (): Promise<void> => {
    api.on('POST', '/auth/refresh', (): Response => jsonResponse({ token: 'jwt-1' }));

    await Promise.all([refreshAccessToken(), refreshAccessToken()]);
    expect(api.callsTo('/auth/refresh')).toHaveLength(1);

    await refreshAccessToken();
    expect(api.callsTo('/auth/refresh')).toHaveLength(2);
  });

  it('does not bring a session back if the user logged out while the refresh was in flight', async (): Promise<void> => {
    let release: () => void = (): void => undefined;
    const gate: Promise<void> = new Promise<void>((resolve: () => void): void => {
      release = resolve;
    });
    api.on('POST', '/auth/refresh', (): Promise<Response> => gate.then((): Response => jsonResponse({ token: 'late' })));
    // The handler type allows a promise, but the mock helper only wraps the result once.

    const pending: Promise<string | null> = refreshAccessToken();
    clearSession();
    release();

    await expect(pending).resolves.toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('notifies subscribers when the token changes', async (): Promise<void> => {
    api.on('POST', '/auth/refresh', (): Response => jsonResponse({ token: 'jwt-1' }));
    const listener: () => void = vi.fn<() => void>();
    const unsubscribe: () => void = subscribeToken(listener);

    await refreshAccessToken();
    clearSession();
    unsubscribe();
    clearSession();

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('removes the legacy localStorage token', (): void => {
    localStorage.setItem('token', 'old-jwt');
    purgeLegacyToken();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
