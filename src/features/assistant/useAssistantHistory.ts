import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { askAssistant, deleteHistoryEntry, fetchHistory, fetchHistoryEntry } from '@/features/assistant/api';
import type { HistoryEntry, HistoryItem } from '@/features/assistant/types';
import type { QueryClient, UseMutationResult, UseQueryResult } from '@tanstack/react-query';

export const historyKeys = {
  list: ['ask-history', 'list'] as const,
  entry: (id: string): readonly ['ask-history', 'entry', string] => ['ask-history', 'entry', id] as const,
};

export function useHistoryList(): UseQueryResult<HistoryItem[]> {
  return useQuery<HistoryItem[]>({
    queryKey: historyKeys.list,
    queryFn: ({ signal }: { signal: AbortSignal }): Promise<HistoryItem[]> => fetchHistory(signal),
  });
}

/** A saved entry never changes (it is a snapshot), so it is fetched once and then served from cache. */
export function useHistoryEntry(id: string): UseQueryResult<HistoryEntry> {
  return useQuery<HistoryEntry>({
    queryKey: historyKeys.entry(id),
    queryFn: ({ signal }: { signal: AbortSignal }): Promise<HistoryEntry> => fetchHistoryEntry(id, signal),
    staleTime: Infinity,
  });
}

/** A question is an action, not a cacheable read, so it is a mutation. The saved entry is cached so opening it needs no request. */
export function useAskAssistant(): UseMutationResult<HistoryEntry, Error, string> {
  const client: QueryClient = useQueryClient();
  return useMutation<HistoryEntry, Error, string>({
    mutationFn: (question: string): Promise<HistoryEntry> => askAssistant(question),
    onSuccess: (entry: HistoryEntry): void => {
      if (entry.id === '') return; // not saved, so there is nothing to list or reopen
      client.setQueryData<HistoryEntry>(historyKeys.entry(entry.id), entry);
      void client.invalidateQueries({ queryKey: historyKeys.list });
    },
  });
}

export function useDeleteHistoryEntry(): UseMutationResult<void, Error, string> {
  const client: QueryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id: string): Promise<void> => deleteHistoryEntry(id),
    onSuccess: (_data: void, id: string): void => {
      client.removeQueries({ queryKey: historyKeys.entry(id) });
      void client.invalidateQueries({ queryKey: historyKeys.list });
    },
  });
}
