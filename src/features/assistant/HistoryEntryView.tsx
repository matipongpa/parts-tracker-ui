import { AlertCircle, Plus } from 'lucide-react';

import { Skeleton } from '@/components/ui/Skeleton';
import { AnswerView } from '@/features/assistant/AnswerView';
import { useHistoryEntry } from '@/features/assistant/useAssistantHistory';
import { ApiError } from '@/lib/api/errors';
import type { HistoryEntry } from '@/features/assistant/types';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactElement } from 'react';

interface HistoryEntryViewProps {
  id: string;
  onNewQuestion: () => void;
}

function NewQuestionButton({ onClick }: { onClick: () => void }): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
    >
      <Plus className="size-4" aria-hidden="true" />
      Ask a new question
    </button>
  );
}

/** A saved question and answer, shown exactly as it was. Opening one never calls the model. */
export function HistoryEntryView({ id, onNewQuestion }: HistoryEntryViewProps): ReactElement {
  const entry: UseQueryResult<HistoryEntry> = useHistoryEntry(id);

  if (entry.isPending) {
    return (
      <div className="space-y-5" aria-busy="true" role="status" aria-label="Loading saved answer">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (entry.isError) {
    const missing: boolean = entry.error instanceof ApiError && entry.error.status === 404;
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface p-6">
        <span className="grid size-10 place-items-center rounded-full bg-danger-soft text-danger">
          <AlertCircle className="size-5" aria-hidden="true" />
        </span>
        <p className="font-medium">{missing ? 'This question is no longer in your history.' : 'Could not load this answer.'}</p>
        {!missing && <p className="text-sm text-muted">{entry.error.message}</p>}
        <NewQuestionButton onClick={onNewQuestion} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <NewQuestionButton onClick={onNewQuestion} />
      <AnswerView entry={entry.data} />
    </div>
  );
}
