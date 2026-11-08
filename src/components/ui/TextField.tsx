import { useId } from 'react';

import { cn } from '@/lib/cn';
import type { InputHTMLAttributes, ReactElement, ReactNode } from 'react';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  /** Icon rendered at the start of the input. */
  icon?: ReactNode;
  /** Node rendered at the end of the input (e.g. a show/hide button). */
  trailing?: ReactNode;
  error?: string;
  hideLabel?: boolean;
}

export function TextField({
  label,
  icon,
  trailing,
  error,
  hideLabel = false,
  className,
  ...rest
}: TextFieldProps): ReactElement {
  const id: string = useId();
  const errorId: string = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className={cn('mb-1.5 block text-sm font-medium', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">{icon}</span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-10 w-full rounded-lg border bg-surface text-sm text-fg shadow-sm transition-colors',
            'placeholder:text-muted/70 hover:border-border-strong focus-visible:outline-offset-0',
            icon ? 'pl-9' : 'pl-3',
            trailing ? 'pr-10' : 'pr-3',
            error ? 'border-danger' : 'border-border',
          )}
          {...rest}
        />
        {trailing && <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
