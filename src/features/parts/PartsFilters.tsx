import { Binary, Cpu, Hash, Search, Tag, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { cn } from '@/lib/cn';
import type { PartFilters } from '@/features/parts/types';
import type { ChangeEvent, ReactElement } from 'react';

interface PartsFiltersProps {
  filters: PartFilters;
  activeCount: number;
  onChange: (patch: Partial<PartFilters>) => void;
  onReset: () => void;
}

// Substring match on the backend, so these are shortcuts, not an exhaustive list.
const QUICK_TYPES: ReadonlyArray<string> = [
  'Resistor',
  'Capacitor',
  'Inductor',
  'Diode',
  'Transistor',
  'Integrated circuit',
  'Connector',
];

export function PartsFilters({ filters, activeCount, onChange, onReset }: PartsFiltersProps): ReactElement {
  const bind = (field: keyof PartFilters): { value: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void } => ({
    value: filters[field],
    onChange: (event: ChangeEvent<HTMLInputElement>): void => onChange({ [field]: event.target.value }),
  });

  return (
    <section aria-label="Filters" className="rounded-xl border border-border bg-surface p-4 shadow-card sm:p-5">
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-5">
        <TextField
          label="Part number"
          className="col-span-2 sm:col-span-1"
          placeholder="Part number"
          icon={<Search className="size-4" aria-hidden="true" />}
          {...bind('partNumber')}
        />
        <TextField
          label="PCB ref."
          placeholder="PCB ref."
          icon={<Cpu className="size-4" aria-hidden="true" />}
          {...bind('pcbRef')}
        />
        <TextField
          label="Value"
          placeholder="e.g. 10k, 100nF"
          icon={<Binary className="size-4" aria-hidden="true" />}
          {...bind('value')}
        />
        <TextField
          label="Description"
          placeholder="Description"
          icon={<Hash className="size-4" aria-hidden="true" />}
          {...bind('description')}
        />
        <TextField
          label="Type"
          placeholder="Type"
          icon={<Tag className="size-4" aria-hidden="true" />}
          {...bind('type')}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium tracking-wide text-muted uppercase">Quick type</span>
        {QUICK_TYPES.map((type: string): ReactElement => {
          const selected: boolean = filters.type.toLowerCase() === type.toLowerCase();
          return (
            <button
              key={type}
              type="button"
              aria-pressed={selected}
              onClick={(): void => onChange({ type: selected ? '' : type })}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                selected
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border bg-surface text-muted hover:border-border-strong hover:text-fg',
              )}
            >
              {type}
            </button>
          );
        })}
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} className="ml-auto">
            <X className="size-3.5" aria-hidden="true" />
            Clear {activeCount} {activeCount === 1 ? 'filter' : 'filters'}
          </Button>
        )}
      </div>
    </section>
  );
}
