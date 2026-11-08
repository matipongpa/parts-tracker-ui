import { AlertCircle } from 'lucide-react';

import { formatAskedAt } from '@/features/assistant/formatDate';
import { PartsTable } from '@/features/parts/PartsTable';
import type { HistoryEntry } from '@/features/assistant/types';
import type { ReactElement } from 'react';

const TOOL_LABELS: Readonly<Record<string, string>> = {
  search_parts: 'Searched parts',
  get_part_usage: 'Checked part usage',
};

const NUMBER_FORMAT: Intl.NumberFormat = new Intl.NumberFormat();

function uniqueToolLabels(tools: ReadonlyArray<string>): string[] {
  return Array.from(new Set<string>(tools)).map((tool: string): string => TOOL_LABELS[tool] ?? tool);
}

/**
 * A question and its answer exactly as given. Everything is shown as plain text: the answer is built from
 * uploaded spreadsheet content, so it is treated as untrusted and never rendered as HTML.
 */
export function AnswerView({ entry }: { entry: HistoryEntry }): ReactElement {
  const labels: string[] = uniqueToolLabels(entry.toolsUsed);
  const count: number = entry.parts.length;
  const saved: boolean = entry.id !== '';
  const askedAt: string = formatAskedAt(entry.createdAt);

  return (
    <div className="space-y-5">
      {!saved && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This answer could not be saved to your history, so it will be gone when you leave this page.
        </div>
      )}

      <section aria-label="Your question" className="rounded-xl border border-border bg-surface-2/60 p-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          You asked{askedAt !== '' && <span className="font-normal normal-case"> · {askedAt}</span>}
        </p>
        <p className="mt-1.5 text-[15px] whitespace-pre-wrap">{entry.question}</p>
      </section>

      <section aria-label="Answer" className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{entry.answer}</p>
        {labels.length > 0 && (
          <p className="mt-4 text-xs text-muted">
            <span className="font-medium">Looked up:</span> {labels.join(' · ')}
          </p>
        )}
      </section>

      {count > 0 && (
        <section aria-label="Matching parts" className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <div className="border-b border-border px-4 py-3 text-sm">
            <span className="font-medium">
              {NUMBER_FORMAT.format(count)} {count === 1 ? 'part' : 'parts'} found
            </span>
            {entry.partsTruncated && (
              <span className="text-muted"> · more matched than can be shown, so this list is partial</span>
            )}
            {saved && <span className="text-muted"> · as they were when you asked</span>}
          </div>
          <PartsTable parts={entry.parts} loading={false} stale={false} pageSize={10} hasFilters={false} />
        </section>
      )}
    </div>
  );
}
