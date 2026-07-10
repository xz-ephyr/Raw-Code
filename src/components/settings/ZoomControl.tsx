import { useState } from 'react';
import { useZoomContext } from '../layout/ZoomProvider';
import { Dropdown } from '../ui/Dropdown';

const ZOOM_PRESETS = [0.5, 0.65, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 2];

export function ZoomControl() {
  const { zoom, setZoomLevel, resetZoom } = useZoomContext();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-sm border border-border bg-muted hover:bg-muted transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted-foreground">
          <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9 9L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M6 4V8M4 6H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {Math.round(zoom * 100)}%
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        width="176px"
        className="py-2"
      >
        <div className="px-4 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
          Zoom
        </div>
        <div className="px-2 py-1 flex flex-col gap-0.5">
          {ZOOM_PRESETS.map((level) => (
            <button
              key={level}
              onClick={() => {
                setZoomLevel(level);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                zoom === level
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {Math.round(level * 100)}%
            </button>
          ))}
        </div>
        <div className="border-t border-border mt-1 pt-1 px-2">
          <button
            onClick={() => {
              resetZoom();
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Reset to 100%
          </button>
        </div>
      </Dropdown>
    </div>
  );
}
