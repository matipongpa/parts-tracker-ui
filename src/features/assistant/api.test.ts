import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { askAssistant, deleteHistoryEntry, fetchHistory, fetchHistoryEntry } from '@/features/assistant/api';
import { ApiError } from '@/lib/api/errors';
import { setAccessToken } from '@/lib/api/session';
import { installApiMock, jsonResponse } from '@/test/apiMock';
import type { HistoryEntry, HistoryItem } from '@/features/assistant/types';
import type { ApiMock } from '@/test/apiMock';

describe('assistant api', (): void => {
  let api: ApiMock;

  beforeEach((): void => {
    api = installApiMock();
    setAccessToken('jwt-123');
  });

  afterEach((): void => {
    api.restore();
  });

  describe('askAssistant', (): void => {
    it('posts the question with the bearer token and maps the saved entry', async (): Promise<void> => {
      api.on('POST', '/ask', (): Response =>
        jsonResponse({
          id: '9',
          question: 'Which projects use GRM188?',
          answer: 'Used in two projects.',
          parts: [{ id: '7', part_number: 'GRM188', pcb_ref: 'A1', project_name: 'Alpha' }],
          parts_truncated: true,
          tools_used: ['get_part_usage'],
          created_at: '2026-11-08T10:30:00Z',
        }),
      );

      const entry: HistoryEntry = await askAssistant('Which projects use GRM188?');

      const init: RequestInit | undefined = api.callsTo('/ask')[0]?.init;
      expect(JSON.parse(String(init?.body))).toEqual({ question: 'Which projects use GRM188?' });
      expect((init?.headers as Headers).get('Authorization')).toBe('Bearer jwt-123');
      expect(entry).toMatchObject({
        id: '9',
        question: 'Which projects use GRM188?',
        answer: 'Used in two projects.',
        partsTruncated: true,
        toolsUsed: ['get_part_usage'],
        createdAt: '2026-11-08T10:30:00Z',
      });
      expect(entry.parts[0]).toMatchObject({ id: '7', part_number: 'GRM188', project_name: 'Alpha', description: '' });
    });

    it('treats null lists (Go serializes empty slices that way) as empty arrays and a missing id as unsaved', async (): Promise<void> => {
      api.on('POST', '/ask', (): Response =>
        jsonResponse({ answer: 'Nothing found.', parts: null, parts_truncated: false, tools_used: null }),
      );
      await expect(askAssistant('anything')).resolves.toEqual({
        id: '',
        question: '',
        answer: 'Nothing found.',
        parts: [],
        partsTruncated: false,
        toolsUsed: [],
        createdAt: '',
      });
    });

    it('drops malformed rows and non-string tool names instead of failing', async (): Promise<void> => {
      api.on('POST', '/ask', (): Response =>
        jsonResponse({ answer: 'ok', parts: [{ nope: 1 }, { id: '1', part_number: 'X' }], tools_used: ['search_parts', 5] }),
      );
      const entry: HistoryEntry = await askAssistant('q');
      expect(entry.parts).toHaveLength(1);
      expect(entry.toolsUsed).toEqual(['search_parts']);
    });

    it('rejects a payload without an answer', async (): Promise<void> => {
      api.on('POST', '/ask', (): Response => jsonResponse({ parts: [] }));
      await expect(askAssistant('q')).rejects.toBeInstanceOf(ApiError);
    });

    it('surfaces the server message and status', async (): Promise<void> => {
      api.on('POST', '/ask', (): Response => jsonResponse({ error: 'The assistant took too long' }, 504));
      await expect(askAssistant('q')).rejects.toMatchObject({ status: 504, message: 'The assistant took too long' });
    });
  });

  describe('history', (): void => {
    it('lists items and skips malformed ones', async (): Promise<void> => {
      api.on('GET', '/ask/history', (): Response =>
        jsonResponse({ list: [{ id: '2', question: 'b', created_at: '2026-11-02T00:00:00Z' }, { id: 5 }, { id: '1', question: 'a' }] }),
      );
      const items: HistoryItem[] = await fetchHistory();
      expect(items).toEqual([
        { id: '2', question: 'b', createdAt: '2026-11-02T00:00:00Z' },
        { id: '1', question: 'a', createdAt: '' },
      ]);
    });

    it('treats a null list as empty', async (): Promise<void> => {
      api.on('GET', '/ask/history', (): Response => jsonResponse({ list: null }));
      await expect(fetchHistory()).resolves.toEqual([]);
    });

    it('fetches one saved entry by id', async (): Promise<void> => {
      api.on('GET', /\/ask\/history\/7$/, (): Response =>
        jsonResponse({ id: '7', question: 'q', answer: 'a', parts: [], parts_truncated: false, tools_used: [], created_at: '2026-11-01T09:00:00Z' }),
      );
      await expect(fetchHistoryEntry('7')).resolves.toMatchObject({ id: '7', question: 'q', answer: 'a' });
    });

    it('encodes the id so it cannot change the request path', async (): Promise<void> => {
      api.on('GET', /.*/, (): Response => jsonResponse({ error: 'Not found' }, 404));
      await expect(fetchHistoryEntry('../part')).rejects.toMatchObject({ status: 404 });
      expect(api.fetchMock.mock.calls[0]?.[0]).toContain('/ask/history/..%2Fpart');
    });

    it('deletes an entry', async (): Promise<void> => {
      api.on('DELETE', /\/ask\/history\/7$/, (): Response => new Response(null, { status: 204 }));
      await expect(deleteHistoryEntry('7')).resolves.toBeUndefined();
      expect(api.callsTo('/ask/history/7')[0]?.init?.method).toBe('DELETE');
    });
  });
});
