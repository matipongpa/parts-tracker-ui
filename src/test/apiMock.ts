import { vi } from 'vitest';

import type { Mock } from 'vitest';

export type MockHandler = (init: RequestInit | undefined, url: string) => Response | Promise<Response>;

export interface RecordedCall {
  url: string;
  init: RequestInit | undefined;
}

export interface ApiMock {
  fetchMock: Mock<typeof fetch>;
  /** Answers `METHOD path`. A string matches the end of the URL path (query ignored); a RegExp tests the whole path. A later `on` wins. */
  on: (method: string, path: string | RegExp, handler: MockHandler) => void;
  /** Every request whose path ends with `path`, in order. */
  callsTo: (path: string) => RecordedCall[];
  restore: () => void;
}

export function jsonResponse(body: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function pathOf(url: string): string {
  return url.split('?')[0] ?? url;
}

/**
 * Stubs global fetch with a tiny router. Unless a test says otherwise, POST /auth/refresh answers 401,
 * i.e. "no session cookie", which is what a first visit looks like.
 */
export function installApiMock(): ApiMock {
  interface Route {
    method: string;
    matches: (path: string) => boolean;
    handler: MockHandler;
  }
  const routes: Route[] = [];
  const calls: RecordedCall[] = [];

  const fetchMock: Mock<typeof fetch> = vi.fn<typeof fetch>((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url: string = String(input);
    calls.push({ url, init });
    const method: string = (init?.method ?? 'GET').toUpperCase();
    const path: string = pathOf(url);
    const route: Route | undefined = routes.find((candidate: Route): boolean => candidate.method === method && candidate.matches(path));
    if (route) return Promise.resolve(route.handler(init, url));
    return Promise.resolve(jsonResponse({ error: `Unmocked ${method} ${path}` }, 500));
  });
  vi.stubGlobal('fetch', fetchMock);

  const mock: ApiMock = {
    fetchMock,
    on: (method: string, path: string | RegExp, handler: MockHandler): void => {
      const matches: (candidate: string) => boolean =
        typeof path === 'string' ? (candidate: string): boolean => candidate.endsWith(path) : (candidate: string): boolean => path.test(candidate);
      // Newest first, so a test can override the defaults installed below.
      routes.unshift({ method: method.toUpperCase(), matches, handler });
    },
    callsTo: (path: string): RecordedCall[] => calls.filter((call: RecordedCall): boolean => pathOf(call.url).endsWith(path)),
    restore: (): void => {
      vi.unstubAllGlobals();
    },
  };
  mock.on('POST', '/auth/refresh', (): Response => jsonResponse({ error: 'Missing refresh token' }, 401));
  return mock;
}
