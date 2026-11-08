import { typeTone } from '@/features/parts/typeTone';
import type { TypeTone } from '@/features/parts/typeTone';
import type { ReactElement } from 'react';

// Full class names (not interpolated) so Tailwind can see and generate them.
const TONES: Record<TypeTone, string> = {
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  sky: 'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300',
  rose: 'bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300',
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
  indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-300',
  teal: 'bg-teal-100 text-teal-800 dark:bg-teal-400/15 dark:text-teal-300',
  slate: 'bg-surface-2 text-muted',
};

export function TypeBadge({ type }: { type: string }): ReactElement {
  if (type === '') return <span className="text-muted">—</span>;
  return (
    <span
      title={type}
      className={`inline-block max-w-44 truncate rounded-full px-2.5 py-0.5 align-middle text-xs font-medium ${TONES[typeTone(type)]}`}
    >
      {type}
    </span>
  );
}
