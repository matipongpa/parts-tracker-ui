import { useState } from 'react';
import { Trash2 } from 'lucide-react';

import { Skeleton } from '@/components/ui/Skeleton';
import { formatAskedAt } from '@/features/assistant/formatDate';
import { useDeleteHistoryEntry, useHistoryList } from '@/features/assistant/useAssistantHistory';
import { cn } from '@/lib/cn';
import type { HistoryItem } from '@/features/assistant/types';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { ReactElement } from 'react';

interface HistoryRowProps {
  item: HistoryItem;
  active: boolean;
  onOpen: () => void;
  confirming: boolean;
  deleting: boolean;
  onAskConfirm: () => void;
  onCancelConfirm: () => void;
  onDelete: () => void;
}

function HistoryRow({ item, active, onOpen, confirming, deleting, onAskConfirm, onCancelConfirm, onDelete }: HistoryRowProps): ReactElement {
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'block w-full rounded-lg px-3 py-2 pr-11 text-left text-sm transition-colors',
          active ? 'bg-accent-soft' : 'hover:bg-surface-2',
        )}
      >
        <span className="line-clamp-2 font-medium break-words">{item.question}</span>
        <span className="mt-0.5 block text-xs text-muted">{formatAskedAt(item.createdAt)}</span>
      </button>
      {/* Two clicks to delete: an answer can take a minute to produce and cannot be brought back. */}
      <button
        type="button"
        disabled={deleting}
        aria-label={confirming ? 'Confirm delete' : 'Delete this question'}
        onClick={confirming ? onDelete : onAskConfirm}
        onBlur={onCancelConfirm}
        className={cn(
          'absolute top-1.5 right-1.5 grid h-7 place-items-center rounded-md text-xs transition-opacity',
          confirming
            ? 'bg-danger px-2 font-medium text-white opacity-100'
            : 'w-7 text-muted opacity-100 hover:bg-surface-2 hover:text-danger focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100',
        )}
      >
        {confirming ? 'Delete?' : <Trash2 className="size-3.5" aria-hidden="true" />}
      </button>
    </li>
  );
}

interface HistoryListProps {
  /** The entry currently open in the panel, if any. */
  openId: string | null;
  onOpen: (id: string) => void;
  /** Called after an entry is deleted, so the panel can leave it if it was the open one. */
  onDeleted: (id: string) => void;
}

/** The signed-in user's saved questions, newest first. */
export function HistoryList({ openId, onOpen, onDeleted }: HistoryListProps): ReactElement {
  const list: UseQueryResult<HistoryItem[]> = useHistoryList();
  const remove: UseMutationResult<void, Error, string> = useDeleteHistoryEntry();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function handleDelete(id: string): void {
    remove.mutate(id, {
      onSuccess: (): void => {
        setConfirmingId(null);
        onDeleted(id);
      },
    });
  }

  return (
    <nav aria-label="Your previous questions">
      <h2 className="mb-2 px-3 text-xs font-medium tracking-wide text-muted uppercase">Previous questions</h2>

      {list.isPending && (
        <div className="space-y-2 px-3" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {list.isError && (
        <p role="alert" className="px-3 text-sm text-danger">
          Could not load your history. {list.error.message}
        </p>
      )}

      {list.isSuccess && list.data.length === 0 && (
        <p className="px-3 text-sm text-muted">Nothing yet. Your questions and answers are saved here.</p>
      )}

      {list.isSuccess && list.data.length > 0 && (
        <ul className="space-y-0.5">
          {list.data.map((item: HistoryItem): ReactElement => (
            <HistoryRow
              key={item.id}
              item={item}
              active={openId === item.id}
              onOpen={(): void => onOpen(item.id)}
              confirming={confirmingId === item.id}
              deleting={remove.isPending && remove.variables === item.id}
              onAskConfirm={(): void => setConfirmingId(item.id)}
              onCancelConfirm={(): void => setConfirmingId((current: string | null): string | null => (current === item.id ? null : current))}
              onDelete={(): void => handleDelete(item.id)}
            />
          ))}
        </ul>
      )}

      {remove.isError && (
        <p role="alert" className="mt-2 px-3 text-sm text-danger">
          Could not delete: {remove.error.message}
        </p>
      )}
    </nav>
  );
}
