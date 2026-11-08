import { useId } from 'react';

import { cn } from '@/lib/cn';
import type { ReactElement, ReactNode, TextareaHTMLAttributes } from 'react';

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  /** Helper text under the field, e.g. a character counter. */
  hint?: ReactNode;
  error?: string;
  hideLabel?: boolean;
}

export function TextArea({ label, hint, error, hideLabel = false, className, ...rest }: TextAreaProps): ReactElement {
  const id: string = useId();
  const errorId: string = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className={cn('mb-1.5 block text-sm font-medium', hideLabel && 'sr-only')}>
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'min-h-24 w-full resize-y rounded-lg border bg-surface px-3 py-2.5 text-sm text-fg shadow-sm transition-colors',
          'placeholder:text-muted/70 hover:border-border-strong focus-visible:outline-offset-0',
          error ? 'border-danger' : 'border-border',
        )}
        {...rest}
      />
      <div className="mt-1.5 flex items-start justify-between gap-3 text-sm">
        {error ? (
          <p id={errorId} className="text-danger">
            {error}
          </p>
        ) : (
          <span />
        )}
        {hint && <span className="shrink-0 text-muted">{hint}</span>}
      </div>
    </div>
  );
}
