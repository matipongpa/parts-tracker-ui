import { SearchX } from 'lucide-react';

import { Skeleton } from '@/components/ui/Skeleton';
import { TypeBadge } from '@/features/parts/TypeBadge';
import { cn } from '@/lib/cn';
import type { Part } from '@/lib/types';
import type { ReactElement } from 'react';

const HEADERS: ReadonlyArray<string> = ['Part number', 'PCB ref.', 'Description', 'Type', 'Value'];

function Dash(): ReactElement {
  return <span className="text-muted">—</span>;
}

function SubText({ children }: { children: string }): ReactElement | null {
  if (children === '') return null;
  return <div className="mt-0.5 truncate text-xs text-muted">{children}</div>;
}

function PartRow({ part }: { part: Part }): ReactElement {
  return (
    <tr className="border-t border-border transition-colors hover:bg-surface-2/60">
      <td className="max-w-64 px-4 py-3 align-top">
        <div className="truncate font-mono text-[13px] font-semibold">{part.part_number}</div>
        <SubText>{part.manufacturer}</SubText>
      </td>
      <td className="max-w-48 px-4 py-3 align-top">
        <div className="truncate font-mono text-[13px]">{part.pcb_ref || <Dash />}</div>
        <SubText>{part.project_name}</SubText>
      </td>
      <td className="max-w-80 px-4 py-3 align-top">
        <div className="line-clamp-2 text-sm" title={part.description}>
          {part.description || <Dash />}
        </div>
        <SubText>{part.footprint}</SubText>
      </td>
      <td className="px-4 py-3 align-top">
        <TypeBadge type={part.type} />
      </td>
      <td className="px-4 py-3 align-top font-mono text-[13px] whitespace-nowrap">{part.value || <Dash />}</td>
    </tr>
  );
}

function SkeletonRows({ count }: { count: number }): ReactElement[] {
  return Array.from({ length: count }, (_: unknown, index: number): ReactElement => (
    <tr key={index} className="border-t border-border">
      <td className="px-4 py-3.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-2 h-3 w-24" />
      </td>
      <td className="px-4 py-3.5">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="px-4 py-3.5">
        <Skeleton className="h-4 w-56" />
      </td>
      <td className="px-4 py-3.5">
        <Skeleton className="h-5 w-20 rounded-full" />
      </td>
      <td className="px-4 py-3.5">
        <Skeleton className="h-4 w-14" />
      </td>
    </tr>
  ));
}

interface PartsTableProps {
  parts: Part[];
  /** First load, nothing to show yet. */
  loading: boolean;
  /** Refetching with previous results still on screen. */
  stale: boolean;
  pageSize: number;
  hasFilters: boolean;
}

export function PartsTable({ parts, loading, stale, pageSize, hasFilters }: PartsTableProps): ReactElement {
  const empty: boolean = !loading && parts.length === 0;

  return (
    <div className="overflow-x-auto" aria-busy={loading || stale}>
      <table className={cn('w-full min-w-[760px] text-left transition-opacity', stale && 'opacity-60')}>
        <thead>
          <tr className="bg-surface-2/70 text-xs font-medium tracking-wide text-muted uppercase">
            {HEADERS.map((header: string): ReactElement => (
              <th key={header} scope="col" className="px-4 py-2.5 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && <SkeletonRows count={Math.min(pageSize, 10)} />}
          {!loading && parts.map((part: Part): ReactElement => <PartRow key={part.id} part={part} />)}
        </tbody>
      </table>

      {empty && (
        <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-surface-2 text-muted">
            <SearchX className="size-5" aria-hidden="true" />
          </span>
          <p className="font-medium">No parts found</p>
          <p className="max-w-sm text-sm text-muted">
            {hasFilters
              ? 'Nothing matches those filters. Try a shorter search term or clear a filter.'
              : 'There are no parts yet. Import a BOM to get started.'}
          </p>
        </div>
      )}
    </div>
  );
}
