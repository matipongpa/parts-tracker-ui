import { cn } from '@/lib/cn';
import type { ReactElement } from 'react';

export function Skeleton({ className }: { className?: string }): ReactElement {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-surface-2', className)} />;
}
