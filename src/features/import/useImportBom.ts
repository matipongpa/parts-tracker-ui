import { useMutation, useQueryClient } from '@tanstack/react-query';

import { importBom } from '@/features/import/api';
import type { ImportRequest, ImportResult } from '@/features/import/types';
import type { QueryClient, UseMutationResult } from '@tanstack/react-query';

export interface ImportVariables extends ImportRequest {
  file: File;
}

/** An upload is an action, not a cacheable read, so it is a mutation. New rows make every cached search stale. */
export function useImportBom(): UseMutationResult<ImportResult, Error, ImportVariables> {
  const client: QueryClient = useQueryClient();
  return useMutation<ImportResult, Error, ImportVariables>({
    mutationFn: ({ file, ...input }: ImportVariables): Promise<ImportResult> => importBom(file, input),
    onSuccess: (result: ImportResult): void => {
      if (result.inserted > 0) void client.invalidateQueries({ queryKey: ['parts'] });
    },
  });
}
