import { ApiError, request } from '@/lib/api/client';
import type { Part, PartsPage, PartsQuery } from '@/lib/types';

/** Builds the search query string, omitting empty filters to keep URLs (and server cache keys) tidy. */
export function buildPartsParams(query: PartsQuery): URLSearchParams {
  const entries: ReadonlyArray<readonly [string, string]> = [
    ['pcb_ref', query.pcbRef],
    ['part_number', query.partNumber],
    ['value', query.value],
    ['description', query.description],
    ['type', query.type],
  ];
  const params: URLSearchParams = new URLSearchParams();
  for (const [key, raw] of entries) {
    const value: string = raw.trim();
    if (value !== '') params.set(key, value);
  }
  params.set('page', String(query.page));
  params.set('page_size', String(query.pageSize));
  return params;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toPart(value: unknown): Part | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  return {
    id: value.id,
    part_number: str(value.part_number),
    pcb_ref: str(value.pcb_ref),
    description: str(value.description),
    footprint: str(value.footprint),
    fit: str(value.fit),
    manufacturer: str(value.manufacturer),
    type: str(value.type),
    project_name: str(value.project_name),
    value: str(value.value),
  };
}

/** Narrows the payload; Go serializes an empty result as `"list": null`, which becomes `[]`. */
function toPartsPage(payload: unknown): PartsPage {
  if (!isRecord(payload) || typeof payload.count !== 'number') {
    throw new ApiError(502, 'Unexpected response from the server.');
  }
  const rawList: unknown[] = Array.isArray(payload.list) ? (payload.list as unknown[]) : [];
  const list: Part[] = rawList.map(toPart).filter((part: Part | null): part is Part => part !== null);
  return { list, count: payload.count };
}

export async function fetchParts(query: PartsQuery, signal?: AbortSignal): Promise<PartsPage> {
  const payload: unknown = await request('/part', { params: buildPartsParams(query), signal });
  return toPartsPage(payload);
}
