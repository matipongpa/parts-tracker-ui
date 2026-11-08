import { jsonResponse } from '@/test/apiMock';
import type { ApiMock } from '@/test/apiMock';

interface StoredEntry {
  id: string;
  question: string;
  answer: string;
  parts: unknown[];
  parts_truncated: boolean;
  tools_used: string[];
  created_at: string;
}

/** What the fake "model" answers with. Change it between questions to script a scenario. */
export interface Reply {
  answer: string;
  parts: unknown[];
  truncated: boolean;
  tools: string[];
}

export interface FakeAskApi {
  /** Saved entries, oldest first (the server lists them newest first). */
  entries: StoredEntry[];
  reply: Reply;
  /** When set, POST /ask answers but reports that nothing was saved (id ""). */
  failSaving: boolean;
}

const DEFAULT_PARTS: unknown[] = [
  { id: '1', part_number: 'GRM188R71H104KA93D', pcb_ref: 'A1', project_name: 'Alpha', type: 'Capacitor' },
  { id: '2', part_number: 'GRM188R71H104KA93D', pcb_ref: 'B7', project_name: 'Beta', type: 'Capacitor' },
];

const ENTRY_PATH: RegExp = /\/ask\/history\/(\d+)$/;

function idFrom(url: string): string {
  return ENTRY_PATH.exec(url.split('?')[0] ?? url)?.[1] ?? '';
}

/** A stateful in-memory stand-in for POST /ask and the /ask/history routes. */
export function installFakeAskApi(api: ApiMock, seed: StoredEntry[] = []): FakeAskApi {
  const fake: FakeAskApi = {
    entries: [...seed],
    reply: { answer: 'GRM188 is used in Alpha and Beta.', parts: DEFAULT_PARTS, truncated: false, tools: ['get_part_usage'] },
    failSaving: false,
  };
  let nextId: number = seed.length + 1;

  api.on('POST', '/ask', (init: RequestInit | undefined): Response => {
    const { question } = JSON.parse(String(init?.body)) as { question: string };
    const entry: StoredEntry = {
      id: fake.failSaving ? '' : String(nextId),
      question,
      answer: fake.reply.answer,
      parts: fake.reply.parts,
      parts_truncated: fake.reply.truncated,
      tools_used: fake.reply.tools,
      created_at: '2026-11-08T10:30:00Z',
    };
    if (!fake.failSaving) {
      nextId += 1;
      fake.entries.push(entry);
    }
    return jsonResponse(entry);
  });

  api.on('GET', '/ask/history', (): Response =>
    jsonResponse({
      list: [...fake.entries].reverse().map((e: StoredEntry): object => ({ id: e.id, question: e.question, created_at: e.created_at })),
    }),
  );

  api.on('GET', ENTRY_PATH, (_init: RequestInit | undefined, url: string): Response => {
    const entry: StoredEntry | undefined = fake.entries.find((e: StoredEntry): boolean => e.id === idFrom(url));
    return entry ? jsonResponse(entry) : jsonResponse({ error: 'Not found' }, 404);
  });

  api.on('DELETE', ENTRY_PATH, (_init: RequestInit | undefined, url: string): Response => {
    const before: number = fake.entries.length;
    fake.entries = fake.entries.filter((e: StoredEntry): boolean => e.id !== idFrom(url));
    return fake.entries.length === before ? jsonResponse({ error: 'Not found' }, 404) : new Response(null, { status: 204 });
  });

  return fake;
}

export function savedEntry(id: string, question: string, answer: string): StoredEntry {
  return {
    id,
    question,
    answer,
    parts: DEFAULT_PARTS,
    parts_truncated: false,
    tools_used: ['search_parts'],
    created_at: '2026-11-01T09:00:00Z',
  };
}
