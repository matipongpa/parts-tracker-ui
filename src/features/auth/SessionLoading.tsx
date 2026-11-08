import { Loader2 } from 'lucide-react';

import type { ReactElement } from 'react';

/** Shown while a reload is trading the refresh cookie for an access token. */
export function SessionLoading(): ReactElement {
  return (
    <div role="status" className="grid min-h-dvh place-items-center text-muted">
      <span className="flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Restoring your session…
      </span>
    </div>
  );
}
