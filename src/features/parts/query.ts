import type { PartFilters, PartsQuery } from '@/lib/types';

/** The backend caps page_size at 100. */
export const PAGE_SIZES: ReadonlyArray<number> = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE: number = 25;

export const EMPTY_FILTERS: PartFilters = {
  pcbRef: '',
  partNumber: '',
  value: '',
  description: '',
  type: '',
};

// Short, readable URL keys. `page` is 1-based in the URL (zero-based for the API).
const KEYS: Record<keyof PartFilters, string> = {
  pcbRef: 'pcb',
  partNumber: 'pn',
  value: 'value',
  description: 'desc',
  type: 'type',
};

function parsePositiveInt(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const parsed: number = Number.parseInt(raw, 10);
  return parsed >= 1 ? parsed : null;
}

export function parseQuery(params: URLSearchParams): PartsQuery {
  const pageSize: number | null = parsePositiveInt(params.get('size'));
  return {
    pcbRef: params.get(KEYS.pcbRef) ?? '',
    partNumber: params.get(KEYS.partNumber) ?? '',
    value: params.get(KEYS.value) ?? '',
    description: params.get(KEYS.description) ?? '',
    type: params.get(KEYS.type) ?? '',
    page: (parsePositiveInt(params.get('page')) ?? 1) - 1,
    pageSize: pageSize !== null && PAGE_SIZES.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
  };
}

/** Inverse of parseQuery; defaults are omitted so the URL stays clean. */
export function toSearchParams(query: PartsQuery): URLSearchParams {
  const params: URLSearchParams = new URLSearchParams();
  (Object.keys(KEYS) as Array<keyof PartFilters>).forEach((field: keyof PartFilters): void => {
    if (query[field] !== '') params.set(KEYS[field], query[field]);
  });
  if (query.page > 0) params.set('page', String(query.page + 1));
  if (query.pageSize !== DEFAULT_PAGE_SIZE) params.set('size', String(query.pageSize));
  return params;
}

export function filtersEqual(a: PartFilters, b: PartFilters): boolean {
  return (Object.keys(KEYS) as Array<keyof PartFilters>).every((field: keyof PartFilters): boolean => a[field] === b[field]);
}

export function countActiveFilters(filters: PartFilters): number {
  return (Object.keys(KEYS) as Array<keyof PartFilters>).filter(
    (field: keyof PartFilters): boolean => filters[field].trim() !== '',
  ).length;
}

/**
 * Typing should not fire a request per keystroke, but paging should feel instant.
 * While the filters are still settling we keep serving the last debounced query
 * (already cached, so no request); once they match, the live query wins.
 */
export function resolveEffectiveQuery(live: PartsQuery, debounced: PartsQuery): PartsQuery {
  return filtersEqual(live, debounced) ? live : debounced;
}
