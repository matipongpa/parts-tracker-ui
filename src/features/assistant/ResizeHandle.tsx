import { useRef, useState } from 'react';

import { MIN_WIDTH, maxWidth } from '@/features/assistant/useAskWidth';
import { cn } from '@/lib/cn';
import type { KeyboardEvent, PointerEvent, ReactElement, RefObject } from 'react';

const KEY_STEP = 24;
const KEY_STEP_BIG = 120;

interface ResizeHandleProps {
  width: number;
  /** Follows the pointer during a drag; not stored. */
  onResize: (width: number) => void;
  /** The drag or key press is finished: store this width. */
  onCommit: (width: number) => void;
  onDraggingChange: (dragging: boolean) => void;
}

interface DragStart {
  x: number;
  width: number;
}

/**
 * The panel's left edge as a draggable separator. The panel sits on the right, so dragging left makes it wider.
 * It also works from the keyboard (arrow keys), as a separator that can be focused should.
 */
export function ResizeHandle({ width, onResize, onCommit, onDraggingChange }: ResizeHandleProps): ReactElement {
  const start: RefObject<DragStart | null> = useRef<DragStart | null>(null);
  const latest: RefObject<number> = useRef<number>(width);
  const [active, setActive] = useState<boolean>(false);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) return;
    start.current = { x: event.clientX, width };
    latest.current = width;
    // Keeps the move events coming even when the pointer leaves the thin handle.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setActive(true);
    onDraggingChange(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (start.current === null) return;
    latest.current = start.current.width + (start.current.x - event.clientX);
    onResize(latest.current);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>): void {
    if (start.current === null) return;
    start.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setActive(false);
    onDraggingChange(false);
    onCommit(latest.current);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const step: number = event.shiftKey ? KEY_STEP_BIG : KEY_STEP;
    // The panel grows to the left, so the arrow that points left makes it wider.
    if (event.key === 'ArrowLeft') onCommit(width + step);
    else if (event.key === 'ArrowRight') onCommit(width - step);
    else if (event.key === 'Home') onCommit(MIN_WIDTH);
    else if (event.key === 'End') onCommit(maxWidth());
    else return;
    event.preventDefault();
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize Ask AI"
      aria-valuenow={width}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={maxWidth()}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      // Wider than it looks (the line is 2px) so it is easy to grab; only on desktop, where the width can change.
      className={cn(
        'absolute inset-y-0 -left-1.5 z-10 hidden w-3 cursor-col-resize touch-none justify-center sm:flex',
        'before:h-full before:w-0.5 before:transition-colors hover:before:bg-accent focus-visible:before:bg-accent',
        active && 'before:bg-accent',
      )}
    />
  );
}
