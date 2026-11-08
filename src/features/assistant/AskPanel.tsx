import { useEffect, useRef, useState } from 'react';
import { History, Plus, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { AskForm } from '@/features/assistant/AskForm';
import { HistoryEntryView } from '@/features/assistant/HistoryEntryView';
import { HistoryList } from '@/features/assistant/HistoryList';
import { cn } from '@/lib/cn';
import type { ReactElement, RefObject } from 'react';

export const ASK_PANEL_ID = 'ask-panel';

interface AskPanelProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Ask AI as a right-hand overlay, so the parts table stays on screen while you ask about it.
 *
 * It is not modal (no backdrop, the page behind stays usable) and it stays mounted while closed, so a
 * half-typed question or a request still in flight survives closing and reopening the panel.
 */
export function AskPanel({ open, onClose }: AskPanelProps): ReactElement {
  const [entryId, setEntryId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const panelRef: RefObject<HTMLElement | null> = useRef<HTMLElement | null>(null);
  const wasOpen: RefObject<boolean> = useRef<boolean>(false);

  // Move focus into the panel when it opens. On close the toggle button in the header already holds focus.
  useEffect((): void => {
    if (open && !wasOpen.current) {
      const target: HTMLElement | null | undefined =
        panelRef.current?.querySelector<HTMLElement>('textarea') ?? panelRef.current?.querySelector<HTMLElement>('button');
      target?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  useEffect((): (() => void) | undefined => {
    if (!open) return undefined;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return (): void => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  function startNewQuestion(): void {
    setEntryId(null);
    setShowHistory(false);
  }

  const showingForm: boolean = entryId === null && !showHistory;

  return (
    <aside
      ref={panelRef}
      id={ASK_PANEL_ID}
      aria-label="Ask AI"
      // `inert` also removes the hidden panel from the tab order and the accessibility tree.
      inert={!open}
      className={cn(
        'fixed top-14 right-0 bottom-0 z-10 flex w-full flex-col border-l border-border bg-surface shadow-xl sm:w-[28rem]',
        'transition-transform duration-200 ease-out',
        open ? 'translate-x-0' : 'invisible translate-x-full',
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-accent" aria-hidden="true" />
          Ask AI
        </h2>
        <div className="flex items-center gap-1">
          {!showingForm && (
            <Button variant="ghost" size="sm" onClick={startNewQuestion} aria-label="New question" className="px-2">
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(): void => setShowHistory((current: boolean): boolean => !current)}
            aria-label="Previous questions"
            aria-pressed={showHistory}
            className={cn('px-2', showHistory && 'bg-accent-soft text-accent')}
          >
            <History className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close Ask AI" className="px-2">
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {showHistory && (
          <HistoryList
            openId={entryId}
            onOpen={(id: string): void => {
              setEntryId(id);
              setShowHistory(false);
            }}
            onDeleted={(id: string): void => {
              // Do not leave the user looking at an entry that no longer exists.
              setEntryId((current: string | null): string | null => (current === id ? null : current));
            }}
          />
        )}
        {!showHistory && entryId !== null && <HistoryEntryView id={entryId} onNewQuestion={startNewQuestion} />}
        {/* Kept mounted (just hidden) so a draft and a question in flight survive a trip to history. */}
        <div hidden={!showingForm}>
          <AskForm onSaved={setEntryId} />
        </div>
      </div>
    </aside>
  );
}
