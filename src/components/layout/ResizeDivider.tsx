import type { MouseEvent, TouchEvent, KeyboardEvent } from 'react';

interface ResizeDividerProps {
  onMouseDown: (e: MouseEvent) => void;
  onTouchStart: (e: TouchEvent) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  ariaValueNow: number;
  ariaValueMin: number;
  ariaValueMax: number;
}

export default function ResizeDivider({
  onMouseDown,
  onTouchStart,
  onKeyDown,
  ariaValueNow,
  ariaValueMin,
  ariaValueMax,
}: ResizeDividerProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={ariaValueNow}
      aria-valuemin={ariaValueMin}
      aria-valuemax={ariaValueMax}
      className="w-[5px] shrink-0 cursor-col-resize bg-transparent relative flex items-center justify-center group/divider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset"
    >
      <div className="w-px h-full bg-border group-hover/divider:bg-muted-foreground group-active/divider:bg-muted-foreground transition-colors" />
    </div>
  );
}
