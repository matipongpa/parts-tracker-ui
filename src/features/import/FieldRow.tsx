import { useId, useState } from 'react';

import { cellSource, columnLetter, columnSource, formatCellRef, parseCellRef, textSource } from '@/features/import/fields';
import { cn } from '@/lib/cn';
import type { FieldDef } from '@/features/import/fields';
import type { Confidence, FieldSource, Preview } from '@/features/import/types';
import type { ChangeEvent, ReactElement } from 'react';

interface FieldRowProps {
  def: FieldDef;
  source: FieldSource | undefined;
  confidence: Confidence | undefined;
  preview: Preview;
  /** The value this field gives on the first row (project name and PCB ref), shown so a bad choice is obvious. */
  resolved?: string;
  onChange: (source: FieldSource | null) => void;
}

const NONE = 'none';
const CELL = 'cell';
const TEXT = 'text';
const COLUMN_PREFIX = 'column:';

function selectValue(source: FieldSource | undefined): string {
  if (source === undefined) return NONE;
  if (source.kind === 'column') return `${COLUMN_PREFIX}${source.column}`;
  return source.kind;
}

const CONFIDENCE_LABEL: Record<Confidence, string | null> = {
  exact: null,
  saved: 'Saved layout',
  partial: 'Check this',
  content: 'Guessed',
  label: 'Next to a label',
};

const INPUT_CLASS = 'h-9 rounded-lg border border-border bg-surface px-2 text-sm shadow-sm hover:border-border-strong';

export function FieldRow({ def, source, confidence, preview, resolved, onChange }: FieldRowProps): ReactElement {
  const id: string = useId();
  const header: string[] = preview.rows[preview.mapping.header_row] ?? [];
  // Text typed into the cell box that is not a valid reference yet. Null means "show the mapped cell".
  const [cellDraft, setCellDraft] = useState<string | null>(null);
  const cellText: string = cellDraft ?? (source?.kind === 'cell' ? formatCellRef(source.row, source.column) : '');
  const cellError: boolean = source?.kind === 'cell' && cellDraft !== null && cellDraft !== '' && parseCellRef(cellDraft) === null;
  const columns: number[] = Array.from({ length: preview.columns }, (_: unknown, index: number): number => index);
  const note: string | null = source === undefined ? null : confidence ? CONFIDENCE_LABEL[confidence] : null;

  function handleSelect(event: ChangeEvent<HTMLSelectElement>): void {
    const value: string = event.target.value;
    if (value === NONE) onChange(null);
    else if (value === CELL) {
      setCellDraft(null);
      onChange(cellSource(0, 0));
    } else if (value === TEXT) onChange(textSource(''));
    else onChange(columnSource(Number(value.slice(COLUMN_PREFIX.length))));
  }

  function handleCell(event: ChangeEvent<HTMLInputElement>): void {
    const parsed: { row: number; column: number } | null = parseCellRef(event.target.value);
    setCellDraft(parsed === null ? event.target.value : null);
    if (parsed !== null) onChange(cellSource(parsed.row, parsed.column));
  }

  return (
    <div className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[11rem_1fr] sm:items-start">
      <label htmlFor={id} className="pt-2 text-sm font-medium">
        {def.label}
        {def.required ? <span className="text-danger" aria-hidden="true"> *</span> : <span className="ml-1 text-xs font-normal text-muted">optional</span>}
      </label>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <select id={id} value={selectValue(source)} onChange={handleSelect} className={cn(INPUT_CLASS, 'min-w-56 max-w-full')}>
            <option value={NONE}>{def.required ? 'Choose a column…' : 'Not used'}</option>
            {columns.map((column: number): ReactElement => (
              <option key={column} value={`${COLUMN_PREFIX}${column}`}>
                Column {columnLetter(column)} — {header[column] || '(blank header)'}
              </option>
            ))}
            {!def.columnOnly && <option value={CELL}>One cell for every row…</option>}
            {!def.columnOnly && <option value={TEXT}>Type a value…</option>}
          </select>
          {source?.kind === 'cell' && (
            <input
              aria-label={`${def.label} cell`}
              value={cellText}
              onChange={handleCell}
              placeholder="B1"
              aria-invalid={cellError ? true : undefined}
              className={cn(INPUT_CLASS, 'w-24', cellError && 'border-danger')}
            />
          )}
          {source?.kind === 'text' && (
            <input
              aria-label={`${def.label} value`}
              value={source.text}
              onChange={(event: ChangeEvent<HTMLInputElement>): void => onChange(textSource(event.target.value))}
              maxLength={200}
              placeholder="Value for every row"
              className={cn(INPUT_CLASS, 'w-56')}
            />
          )}
          {note && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">{note}</span>}
        </div>
        {cellError && <p className="text-xs text-danger">Use a cell like B1.</p>}
        {resolved !== undefined && source !== undefined && (
          <p className="text-xs text-muted">
            First value: <span className="font-medium text-fg">{resolved || '(empty)'}</span>
          </p>
        )}
      </div>
    </div>
  );
}
