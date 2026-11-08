import { useCallback, useState } from 'react';

const WIDTH_KEY: string = 'ask-panel-width';

export const DEFAULT_WIDTH = 448;
export const MIN_WIDTH = 384;
/** What the "wider" button jumps to. */
export const WIDE_WIDTH = 1152;
/** Space always left for the page behind the panel. */
export const PAGE_MARGIN = 48;

/** The widest the panel may be right now: the window less a strip of the page. */
export function maxWidth(): number {
  return Math.max(MIN_WIDTH, window.innerWidth - PAGE_MARGIN);
}

export function clampWidth(width: number): number {
  return Math.round(Math.min(Math.max(width, MIN_WIDTH), maxWidth()));
}

function readWidth(): number {
  try {
    const stored: number = Number(localStorage.getItem(WIDTH_KEY));
    return Number.isFinite(stored) && stored > 0 ? clampWidth(stored) : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

/**
 * The Ask AI panel's width in px (desktop only). `setWidth` follows a drag and is not stored; `commit` stores
 * the final width. It is a viewing preference, so it lives in this browser only.
 */
export function useAskWidth(): { width: number; setWidth: (width: number) => void; commit: (width: number) => void } {
  const [width, setWidthState] = useState<number>(readWidth);

  const setWidth: (next: number) => void = useCallback((next: number): void => setWidthState(clampWidth(next)), []);

  const commit: (next: number) => void = useCallback((next: number): void => {
    const clamped: number = clampWidth(next);
    setWidthState(clamped);
    try {
      localStorage.setItem(WIDTH_KEY, String(clamped));
    } catch {
      // Remembering is a convenience; the panel keeps its width for this session.
    }
  }, []);

  return { width, setWidth, commit };
}
