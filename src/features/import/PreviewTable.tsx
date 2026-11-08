import { cn } from '@/lib/cn';
import { columnLetter, fieldsByColumn, labelOf } from '@/features/import/fields';
import type { FieldKey, Mapping, Preview } from '@/features/import/types';
import type { ReactElement } from 'react';

interface PreviewTableProps {
  preview: Preview;
  mapping: Mapping;
  onHeaderRowChange: (row: number) => void;
}

/** Cells that a "fixed cell" field reads, so the user can see where the project name comes from. */
function referencedCells(mapping: Mapping): Set<string> {
  const cells: Set<string> = new Set<string>();
  for (const source of Object.values(mapping.fields)) {
    if (source?.kind === 'cell') cells.add(`${source.row}:${source.column}`);
  }
  return cells;
}

/** The top of the sheet with column letters, the field each column feeds, and the header row marked. */
export function PreviewTable({ preview, mapping, onHeaderRowChange }: PreviewTableProps): ReactElement {
  const byColumn: Map<number, FieldKey[]> = fieldsByColumn(mapping);
  const cells: Set<string> = referencedCells(mapping);
  const columns: number[] = Array.from({ length: preview.columns }, (_: unknown, index: number): number => index);

  return (
    <div className="max-h-96 overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-xs">
        <caption className="sr-only">
          First {preview.rows.length} of {preview.totalRows} rows of {preview.sheet}. Press a row number to use that row as the header.
        </caption>
        <thead className="sticky top-0 z-10 bg-surface">
          <tr>
            <th scope="col" className="w-10 border-b border-border px-2 py-1.5 text-muted">
              <span className="sr-only">Row</span>
            </th>
            {columns.map((column: number): ReactElement => {
              const fields: FieldKey[] | undefined = byColumn.get(column);
              return (
                <th key={column} scope="col" className="min-w-28 border-b border-l border-border px-2 py-1.5 align-top font-medium">
                  <span className="text-muted">{columnLetter(column)}</span>
                  <span className={cn('mt-1 block min-h-5 font-semibold', fields ? 'text-accent' : 'text-muted/60')}>
                    {fields ? fields.map(labelOf).join(', ') : 'Not used'}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {preview.rows.map((row: string[], rowIndex: number): ReactElement => {
            const isHeader: boolean = rowIndex === mapping.header_row;
            return (
              <tr key={rowIndex} className={cn(isHeader && 'bg-accent-soft font-semibold', rowIndex < mapping.header_row && 'text-muted')}>
                <th scope="row" className="border-t border-border p-0 text-right font-normal">
                  <button
                    type="button"
                    onClick={(): void => onHeaderRowChange(rowIndex)}
                    aria-label={`Use row ${rowIndex + 1} as the header`}
                    aria-pressed={isHeader}
                    title="Use as header row"
                    className="w-full cursor-pointer px-2 py-1.5 text-muted hover:bg-surface-2 hover:text-fg"
                  >
                    {rowIndex + 1}
                  </button>
                </th>
                {row.map((cell: string, column: number): ReactElement => (
                  <td
                    key={column}
                    className={cn(
                      'max-w-56 truncate border-l border-t border-border px-2 py-1.5',
                      cells.has(`${rowIndex}:${column}`) && 'outline-2 -outline-offset-2 outline-accent',
                    )}
                    title={cell}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
