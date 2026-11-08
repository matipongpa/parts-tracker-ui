import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { fetchParts } from '@/features/parts/api';
import type { PartsQuery, PartsResult } from '@/features/parts/types';
import type { UseQueryResult } from '@tanstack/react-query';

/** Owns the cache key and fetching for the parts list; keeps the previous page on screen while the next loads. */
export function usePartsSearch(query: PartsQuery): UseQueryResult<PartsResult> {
  return useQuery<PartsResult>({
    queryKey: ['parts', query],
    queryFn: ({ signal }: { signal: AbortSignal }): Promise<PartsResult> => fetchParts(query, signal),
    placeholderData: keepPreviousData,
  });
}
