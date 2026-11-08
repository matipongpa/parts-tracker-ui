import { CircuitBoard, Search } from 'lucide-react';

import type { ReactElement, ReactNode } from 'react';

const HIGHLIGHTS: ReadonlyArray<string> = [
  'Search across PCB refs, part numbers, values and descriptions',
  'Every BOM, one searchable catalogue',
  'Fast filtering by component type',
];

/** Shared split-screen frame for the login and register pages. */
export function AuthLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[oklch(0.2_0.06_272)] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40 [background-image:linear-gradient(oklch(1_0_0/0.07)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.07)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_30%_20%,black,transparent_75%)]"
        />
        <div
          aria-hidden="true"
          className="absolute -right-24 -bottom-24 size-96 rounded-full bg-[oklch(0.6_0.2_272)] opacity-30 blur-3xl"
        />
        <div className="relative flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <CircuitBoard className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Parts Tracker</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl leading-tight font-semibold tracking-tight text-balance">
            Find any component in seconds.
          </h2>
          <ul className="mt-8 space-y-4 text-[15px] text-white/80">
            {HIGHLIGHTS.map((text: string): ReactElement => (
              <li key={text} className="flex items-start gap-3">
                <Search className="mt-0.5 size-4 shrink-0 text-white/60" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/50">Electronic parts, tracked per project and PCB.</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-fg">
              <CircuitBoard className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Parts Tracker</span>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
