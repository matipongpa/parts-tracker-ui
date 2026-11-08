import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { request } from '@/lib/api/client';
import { getAccessToken, setAccessToken } from '@/lib/api/session';
import { installApiMock, jsonResponse } from '@/test/apiMock';
import type { ApiMock, RecordedCall } from '@/test/apiMock';

function bearer(init: RequestInit | undefined): string | null {
  return (init?.headers as Headers).get('Authorization');
}

describe('request: silent refresh', (): void => {
  let api: ApiMock;

  beforeEach((): void => {
    api = installApiMock();
  });

  afterEach((): void => {
    api.restore();
  });

  it('refreshes once on a 401 and replays the request with the new token', async (): Promise<void> => {
    setAccessToken('expired');
    api.on('GET', '/thing', (init: RequestInit | undefined): Response =>
      bearer(init) === 'Bearer fresh' ? jsonResponse({ ok: true }) : jsonResponse({ error: 'Unauthorized' }, 401),
    );
    api.on('POST', '/auth/refresh', (): Response => jsonResponse({ token: 'fresh' }));

    await expect(request('/thing')).resolves.toEqual({ ok: true });

    expect(api.callsTo('/thing').map((call): string | null => bearer(call.init))).toEqual(['Bearer expired', 'Bearer fresh']);
    expect(api.callsTo('/auth/refresh')[0]?.init?.credentials).toBe('include');
    expect(getAccessToken()).toBe('fresh');
  });

  it('gives up with the original 401 and drops the session when the refresh cookie is rejected', async (): Promise<void> => {
    setAccessToken('expired');
    api.on('GET', '/thing', (): Response => jsonResponse({ error: 'Unauthorized' }, 401));

    await expect(request('/thing')).rejects.toMatchObject({ status: 401, message: 'Unauthorized' });

    expect(api.callsTo('/thing')).toHaveLength(1);
    expect(getAccessToken()).toBeNull();
  });

  it('does not retry forever when the fresh token is rejected too', async (): Promise<void> => {
    setAccessToken('expired');
    api.on('GET', '/thing', (): Response => jsonResponse({ error: 'Unauthorized' }, 401));
    api.on('POST', '/auth/refresh', (): Response => jsonResponse({ token: 'fresh' }));

    await expect(request('/thing')).rejects.toMatchObject({ status: 401 });

    expect(api.callsTo('/thing')).toHaveLength(2);
    expect(api.callsTo('/auth/refresh')).toHaveLength(1);
  });

  it('shares one refresh between requests that expire together', async (): Promise<void> => {
    setAccessToken('expired');
    api.on('GET', '/thing', (init: RequestInit | undefined): Response =>
      bearer(init) === 'Bearer fresh' ? jsonResponse({ ok: true }) : jsonResponse({ error: 'Unauthorized' }, 401),
    );
    api.on('POST', '/auth/refresh', (): Response => jsonResponse({ token: 'fresh' }));

    await Promise.all([request('/thing'), request('/thing'), request('/thing')]);

    expect(api.callsTo('/auth/refresh')).toHaveLength(1);
  });

  it('never refreshes for calls that opt out of auth (a wrong password is not an expired token)', async (): Promise<void> => {
    api.on('POST', '/login', (): Response => jsonResponse({ error: 'Invalid username or password' }, 401));

    await expect(request('/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({ status: 401 });

    expect(api.callsTo('/auth/refresh')).toHaveLength(0);
  });

  it('keeps the session when the refresh itself cannot reach the server', async (): Promise<void> => {
    setAccessToken('expired');
    api.on('GET', '/thing', (): Response => jsonResponse({ error: 'Unauthorized' }, 401));
    api.fetchMock.mockImplementation((input: RequestInfo | URL): Promise<Response> => {
      if (String(input).endsWith('/auth/refresh')) return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve(jsonResponse({ error: 'Unauthorized' }, 401));
    });

    await expect(request('/thing')).rejects.toMatchObject({ status: 0 });

    // An outage says nothing about the session, so the token is not thrown away.
    expect(getAccessToken()).toBe('expired');
  });

  it('only sends cookies when asked to', async (): Promise<void> => {
    api.on('GET', '/thing', (): Response => jsonResponse({}));
    api.on('POST', '/auth/logout', (): Response => new Response(null, { status: 204 }));

    await request('/thing');
    await request('/auth/logout', { method: 'POST', auth: false, withCookies: true });

    expect(api.callsTo('/thing')[0]?.init?.credentials).toBe('same-origin');
    expect(api.callsTo('/auth/logout')[0]?.init?.credentials).toBe('include');
  });
});

describe('request: multipart bodies', (): void => {
  let api: ApiMock;

  beforeEach((): void => {
    api = installApiMock();
  });

  afterEach((): void => {
    api.restore();
  });

  it('sends a FormData as is and replays the same form after a silent refresh', async (): Promise<void> => {
    setAccessToken('expired');
    api.on('POST', '/upload', (init: RequestInit | undefined): Response =>
      bearer(init) === 'Bearer fresh' ? jsonResponse({ ok: true }) : jsonResponse({ error: 'Unauthorized' }, 401),
    );
    api.on('POST', '/auth/refresh', (): Response => jsonResponse({ token: 'fresh' }));
    const form: FormData = new FormData();
    form.append('file', new File(['x'], 'a.xlsx'));

    await expect(request('/upload', { method: 'POST', body: form })).resolves.toEqual({ ok: true });

    const calls: RecordedCall[] = api.callsTo('/upload');
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.init?.body).toBe(form);
      expect((call.init?.headers as Headers).has('Content-Type')).toBe(false);
    }
  });
});
