import React from 'react';
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
  return (
    <div className="mb-2 group">
      <div className="relative bg-muted rounded-[12px] text-[14px] text-foreground">
        <div className="px-4 py-2 whitespace-normal break-words leading-relaxed overflow-x-hidden">
          {content}
        </div>
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
