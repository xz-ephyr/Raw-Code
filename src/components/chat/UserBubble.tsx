import React, { useState, useRef, useEffect } from 'react';
import { CopyButton } from './CopyButton';

function formatTime(ts: number): string {
  const d = new Date(ts);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${hours}:${minutes}${ampm}`;
}

export const UserBubble = React.memo(({ content, createdAt, model }: { content: string; createdAt?: number; model?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = innerRef.current;
    if (el) {
      setOverflows(el.scrollHeight > 100);
    }
  }, [content]);

  return (
    <div className="mb-2 group">
      <div
        className="relative bg-muted rounded-[12px] text-[14px] text-foreground cursor-pointer overflow-hidden"
        onClick={() => overflows && setExpanded(e => !e)}
      >
        <div
          ref={innerRef}
          className={`px-4 py-2 whitespace-normal break-words leading-relaxed overflow-x-hidden transition-all ${expanded ? '' : 'max-h-[100px] overflow-hidden'}`}
        >
          {content}
        </div>
        {overflows && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted to-transparent pointer-events-none" />
        )}
        {overflows && (
          <div className="text-[11px] text-muted-foreground/60 text-center pb-1 select-none">
            {expanded ? 'Show less' : 'Show more'}
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ userSelect: 'none' }}>
        {model && (
          <span className="text-[11px] font-medium text-muted-foreground select-none whitespace-nowrap">{model}</span>
        )}
        {createdAt && (
          <span className="text-[11px] text-muted-foreground/60">{formatTime(createdAt)}</span>
        )}
        <CopyButton content={content} alwaysVisible={false} />
      </div>
    </div>
  );
});
