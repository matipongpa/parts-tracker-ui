import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_SIZE,
  EMPTY_FILTERS,
  countActiveFilters,
  parseQuery,
  resolveEffectiveQuery,
  toSearchParams,
} from '@/features/parts/searchParams';
import type { PartsQuery } from '@/features/parts/types';

const BASE: PartsQuery = { ...EMPTY_FILTERS, page: 0, pageSize: DEFAULT_PAGE_SIZE };

describe('parseQuery', (): void => {
  it('returns defaults for an empty URL', (): void => {
    expect(parseQuery(new URLSearchParams(''))).toEqual(BASE);
  });

  it('reads filters and converts the 1-based URL page to a 0-based index', (): void => {
    const query: PartsQuery = parseQuery(new URLSearchParams('pn=LM358&pcb=A1&type=IC&page=3&size=50'));
    expect(query).toMatchObject({ partNumber: 'LM358', pcbRef: 'A1', type: 'IC', page: 2, pageSize: 50 });
  });

  it.each(['0', '-1', 'abc', '1.5', ''])('falls back to page 1 for invalid page "%s"', (raw: string): void => {
    expect(parseQuery(new URLSearchParams({ page: raw })).page).toBe(0);
  });

  it('rejects page sizes the backend would not accept', (): void => {
    expect(parseQuery(new URLSearchParams('size=500')).pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(parseQuery(new URLSearchParams('size=7')).pageSize).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe('toSearchParams', (): void => {
  it('omits defaults and empty filters', (): void => {
    expect(toSearchParams(BASE).toString()).toBe('');
  });

  it('round-trips through parseQuery', (): void => {
    const query: PartsQuery = { ...BASE, partNumber: 'a&b=c', value: '10k', page: 4, pageSize: 100 };
    expect(parseQuery(toSearchParams(query))).toEqual(query);
  });
});

describe('countActiveFilters', (): void => {
  it('ignores empty and whitespace-only filters', (): void => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, type: 'Resistor', value: '   ' })).toBe(1);
  });
});

describe('resolveEffectiveQuery', (): void => {
  it('keeps serving the last debounced query while filters are still changing', (): void => {
    const live: PartsQuery = { ...BASE, partNumber: 'LM3' };
    const debounced: PartsQuery = { ...BASE, partNumber: 'LM', page: 2 };
    expect(resolveEffectiveQuery(live, debounced)).toBe(debounced);
  });

  it('applies paging immediately once filters have settled', (): void => {
    const live: PartsQuery = { ...BASE, partNumber: 'LM', page: 3 };
    const debounced: PartsQuery = { ...BASE, partNumber: 'LM', page: 0 };
    expect(resolveEffectiveQuery(live, debounced)).toBe(live);
  });
});
