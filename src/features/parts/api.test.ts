import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildPartsParams, fetchParts } from '@/features/parts/api';
import { ApiError } from '@/lib/api/errors';
import { setAccessToken } from '@/lib/api/session';
import type { PartsQuery, PartsResult } from '@/features/parts/types';
import type { Mock } from 'vitest';

const QUERY: PartsQuery = {
  pcbRef: '',
  partNumber: ' LM358 ',
  value: '',
  description: '',
  type: 'Resistor',
  page: 2,
  pageSize: 25,
};

function jsonResponse(body: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('buildPartsParams', (): void => {
  it('omits empty filters, trims values and always sends paging', (): void => {
    expect(buildPartsParams(QUERY).toString()).toBe('part_number=LM358&type=Resistor&page=2&page_size=25');
  });
});

describe('fetchParts', (): void => {
  let fetchMock: Mock<typeof fetch>;

  beforeEach((): void => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('sends the bearer token and returns parsed parts', async (): Promise<void> => {
    setAccessToken('jwt-123');
    fetchMock.mockResolvedValue(
      jsonResponse({ list: [{ id: '7', part_number: 'LM358', type: 'Integrated circuit (IC)' }], count: 1 }),
    );

    const page: PartsResult = await fetchParts(QUERY);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('/part?part_number=LM358&type=Resistor&page=2&page_size=25');
    expect((init?.headers as Headers).get('Authorization')).toBe('Bearer jwt-123');
    expect(page.count).toBe(1);
    expect(page.list[0]).toMatchObject({ id: '7', part_number: 'LM358', description: '', value: '' });
  });

  it('treats the backend\'s null list (empty result) as an empty array', async (): Promise<void> => {
    fetchMock.mockResolvedValue(jsonResponse({ list: null, count: 0 }));
    await expect(fetchParts(QUERY)).resolves.toEqual({ list: [], count: 0 });
  });

  it('surfaces the server error message and status', async (): Promise<void> => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, 401));
    await expect(fetchParts(QUERY)).rejects.toMatchObject({ name: 'ApiError', status: 401, message: 'Unauthorized' });
  });

  it('rejects a payload that does not match the contract', async (): Promise<void> => {
    fetchMock.mockResolvedValue(jsonResponse({ nope: true }));
    await expect(fetchParts(QUERY)).rejects.toBeInstanceOf(ApiError);
  });

  it('reports network failures as a friendly ApiError with status 0', async (): Promise<void> => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchParts(QUERY)).rejects.toMatchObject({ status: 0 });
  });
});
