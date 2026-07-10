import React from 'react';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { ArrowTurnBackwardIcon } from '@hugeicons/core-free-icons';
import { CopyButton } from './CopyButton';

function formatTime(ts: number): string {
  const d = new Date(ts);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${hours}:${minutes}${ampm}`;
}

export const UserBubble = React.memo(({ content, createdAt, onRegenerate }: { content: string; createdAt?: number; onRegenerate?: () => void }) => {
  return (
    <div className="flex flex-col items-end mb-2 group w-full">
      <div className="relative bg-muted rounded-[12px] text-[15px] max-w-[85%] text-foreground">
        <div className="px-5 py-3 whitespace-pre-wrap break-words leading-relaxed">
          {content}
        </div>
      </div>
      <div className="flex items-center gap-2 mr-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {createdAt && (
          <span className="text-[11px] text-muted-foreground/60">{formatTime(createdAt)}</span>
        )}
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            className="hover:text-foreground transition-colors"
            title="Regenerate"
            aria-label="Regenerate"
          >
            <HugeiconRenderer icon={ArrowTurnBackwardIcon} size={16} />
          </button>
        )}
        <CopyButton content={content} alwaysVisible={false} />
      </div>
    </div>
  );
});
