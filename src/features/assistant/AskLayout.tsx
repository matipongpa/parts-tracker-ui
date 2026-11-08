import { Outlet } from 'react-router-dom';

import { HistoryList } from '@/features/assistant/HistoryList';
import type { ReactElement } from 'react';

/** /ask frame: the page for the current question or saved entry, with the user's history beside it. */
export function AskLayout(): ReactElement {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="order-last lg:order-first">
        <HistoryList />
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
