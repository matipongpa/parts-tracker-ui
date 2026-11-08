import { ChevronLeft, ChevronRight } from 'lucide-react';

import { getPageItems } from '@/features/parts/pageItems';
import { PAGE_SIZES } from '@/features/parts/searchParams';
import { cn } from '@/lib/cn';
import type { PageItem } from '@/features/parts/pageItems';
import type { ChangeEvent, ReactElement } from 'react';

interface PaginationProps {
  /** Zero-based. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const NUMBER_FORMAT: Intl.NumberFormat = new Intl.NumberFormat();

const NAV_BUTTON: string =
  'grid size-8 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps): ReactElement {
  const totalPages: number = Math.max(1, Math.ceil(total / pageSize));
  const from: number = total === 0 ? 0 : page * pageSize + 1;
  const to: number = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted" aria-live="polite">
        Showing <span className="font-medium text-fg">{NUMBER_FORMAT.format(from)}</span>–
        <span className="font-medium text-fg">{NUMBER_FORMAT.format(to)}</span> of{' '}
        <span className="font-medium text-fg">{NUMBER_FORMAT.format(total)}</span>
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-muted">
          Rows
          <select
            value={pageSize}
            onChange={(event: ChangeEvent<HTMLSelectElement>): void => onPageSizeChange(Number(event.target.value))}
            className="h-8 cursor-pointer rounded-lg border border-border bg-surface px-2 text-sm text-fg"
          >
            {PAGE_SIZES.map((size: number): ReactElement => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <nav aria-label="Pagination" className="flex items-center gap-0.5">
          <button
            type="button"
            className={NAV_BUTTON}
            aria-label="Previous page"
            disabled={page <= 0}
            onClick={(): void => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" />
          </button>
          {getPageItems(page, totalPages).map((item: PageItem, index: number): ReactElement =>
            item === 'gap' ? (
              <span key={`gap-${index}`} className="grid size-8 place-items-center text-sm text-muted" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-label={`Page ${item + 1}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={(): void => onPageChange(item)}
                className={cn(
                  'h-8 min-w-8 cursor-pointer rounded-lg px-2 text-sm font-medium transition-colors',
                  item === page ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                {item + 1}
              </button>
            ),
          )}
          <button
            type="button"
            className={NAV_BUTTON}
            aria-label="Next page"
            disabled={page >= totalPages - 1}
            onClick={(): void => onPageChange(page + 1)}
          >
            <ChevronRight className="size-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}
