import { vi } from 'vitest';

import type { Mock } from 'vitest';

export type MockHandler = (init: RequestInit | undefined) => Response | Promise<Response>;

export interface RecordedCall {
  url: string;
  init: RequestInit | undefined;
}

export interface ApiMock {
  fetchMock: Mock<typeof fetch>;
  /** Answers `METHOD path` (path matched against the end of the URL, query string ignored). */
  on: (method: string, path: string, handler: MockHandler) => void;
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
  const handlers: Map<string, MockHandler> = new Map<string, MockHandler>();
  const calls: RecordedCall[] = [];

  const fetchMock: Mock<typeof fetch> = vi.fn<typeof fetch>((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url: string = String(input);
    calls.push({ url, init });
    const method: string = (init?.method ?? 'GET').toUpperCase();
    const path: string = pathOf(url);
    for (const [key, handler] of handlers) {
      const [handlerMethod, handlerPath] = key.split(' ');
      if (handlerMethod === method && handlerPath !== undefined && path.endsWith(handlerPath)) {
        return Promise.resolve(handler(init));
      }
    }
    return Promise.resolve(jsonResponse({ error: `Unmocked ${method} ${path}` }, 500));
  });
  vi.stubGlobal('fetch', fetchMock);

  const mock: ApiMock = {
    fetchMock,
    on: (method: string, path: string, handler: MockHandler): void => {
      handlers.set(`${method.toUpperCase()} ${path}`, handler);
    },
    callsTo: (path: string): RecordedCall[] => calls.filter((call: RecordedCall): boolean => pathOf(call.url).endsWith(path)),
    restore: (): void => {
      vi.unstubAllGlobals();
    },
  };
  mock.on('POST', '/auth/refresh', (): Response => jsonResponse({ error: 'Missing refresh token' }, 401));
  return mock;
}
