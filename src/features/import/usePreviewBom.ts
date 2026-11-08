import { useQuery } from '@tanstack/react-query';

import { previewBom } from '@/features/import/api';
import type { Preview, PreviewRequest } from '@/features/import/types';
import type { Query, UseQueryResult } from '@tanstack/react-query';

/** A File cannot be a cache key, so name, size and modified time stand in for it. */
function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/**
 * Asks the server to read the file. A read, not an action (nothing is stored), so it is a query: changing the
 * sheet, header row or mapping is just a new key, a stale answer is cancelled, and the previous preview stays
 * on screen while the next loads (but never another file's preview). Pass null for no file.
 */
export function usePreviewBom(file: File | null, query: PreviewRequest): UseQueryResult<Preview> {
  const key: string | null = file === null ? null : fileKey(file);
  return useQuery<Preview>({
    queryKey: ['bom-preview', key, query],
    queryFn: ({ signal }: { signal: AbortSignal }): Promise<Preview> => {
      if (file === null) throw new Error('No file chosen');
      return previewBom(file, query, signal);
    },
    enabled: file !== null,
    placeholderData: (previous: Preview | undefined, previousQuery: Query<Preview> | undefined): Preview | undefined =>
      key !== null && previousQuery?.queryKey[1] === key ? previous : undefined,
    staleTime: Infinity,
    gcTime: 60_000,
  });
}
