import { useEffect, useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Pagination } from '@/features/parts/Pagination';
import { PartsFilters } from '@/features/parts/PartsFilters';
import { PartsTable } from '@/features/parts/PartsTable';
import { EMPTY_FILTERS, countActiveFilters, parseQuery, resolveEffectiveQuery, toSearchParams } from '@/features/parts/query';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchParts } from '@/lib/api/parts';
import type { PartFilters, PartsPage as PartsPageData, PartsQuery } from '@/lib/types';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactElement } from 'react';

const SEARCH_DEBOUNCE_MS: number = 300;
const NUMBER_FORMAT: Intl.NumberFormat = new Intl.NumberFormat();

export function PartsPage(): ReactElement {
  // The URL is the single source of truth for filters and paging: searches are
  // shareable, and Back/Forward just work, with no draft state to keep in sync.
  const [searchParams, setSearchParams] = useSearchParams();
  const paramsKey: string = searchParams.toString();
  const query: PartsQuery = useMemo<PartsQuery>((): PartsQuery => parseQuery(new URLSearchParams(paramsKey)), [paramsKey]);

  const debouncedQuery: PartsQuery = useDebounce<PartsQuery>(query, SEARCH_DEBOUNCE_MS);
  const effectiveQuery: PartsQuery = resolveEffectiveQuery(query, debouncedQuery);

  const result: UseQueryResult<PartsPageData> = useQuery<PartsPageData>({
    queryKey: ['parts', effectiveQuery],
    queryFn: ({ signal }: { signal: AbortSignal }): Promise<PartsPageData> => fetchParts(effectiveQuery, signal),
    placeholderData: keepPreviousData,
  });

  const total: number = result.data?.count ?? 0;
  const parts: PartsPageData['list'] = result.data?.list ?? [];
  const filters: PartFilters = query;
  const activeFilters: number = countActiveFilters(filters);
  const typing: boolean = effectiveQuery !== query;

  function update(next: PartsQuery): void {
    // replace: typing shouldn't pile one history entry per keystroke onto Back.
    setSearchParams(toSearchParams(next), { replace: true });
  }

  function handleFilterChange(patch: Partial<PartFilters>): void {
    update({ ...query, ...patch, page: 0 });
  }

  // A stale URL (or rows deleted elsewhere) can point past the last page; snap back.
  useEffect((): void => {
    if (!result.isPlaceholderData && result.data && result.data.list.length === 0 && result.data.count > 0 && query.page > 0) {
      update({ ...query, page: Math.max(0, Math.ceil(result.data.count / query.pageSize) - 1) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- update/query are derived from paramsKey
  }, [result.data, result.isPlaceholderData, paramsKey]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Parts</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted" aria-live="polite">
            {result.data ? (
              <>
                {NUMBER_FORMAT.format(total)} {total === 1 ? 'part' : 'parts'}
                {activeFilters > 0 && ' match your filters'}
              </>
            ) : (
              'Browse and search every part across your projects.'
            )}
            {(result.isFetching || typing) && result.data && (
              <Loader2 className="size-3.5 animate-spin" aria-label="Updating results" />
            )}
          </p>
        </div>
      </div>

      <PartsFilters
        filters={filters}
        activeCount={activeFilters}
        onChange={handleFilterChange}
        onReset={(): void => update({ ...query, ...EMPTY_FILTERS, page: 0 })}
      />

      <section aria-label="Results" className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        {result.isError && !result.data ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-danger-soft text-danger">
              <AlertCircle className="size-5" aria-hidden="true" />
            </span>
            <p className="font-medium">Couldn’t load parts</p>
            <p className="max-w-sm text-sm text-muted">{result.error.message}</p>
            <Button onClick={(): void => void result.refetch()}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : (
          <>
            <PartsTable
              parts={parts}
              loading={result.isPending}
              stale={result.isPlaceholderData || typing}
              pageSize={query.pageSize}
              hasFilters={activeFilters > 0}
            />
            {!result.isPending && (
              <Pagination
                page={query.page}
                pageSize={query.pageSize}
                total={total}
                onPageChange={(page: number): void => update({ ...query, page })}
                onPageSizeChange={(pageSize: number): void => update({ ...query, pageSize, page: 0 })}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
