import React from 'react';
import { PenTool02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

interface WritingToolShimmerProps {
  title: string;
}

export const WritingToolShimmer = React.memo(({ title }: WritingToolShimmerProps) => {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-50 rounded-[6px] text-xs font-medium text-neutral-500 border border-neutral-200">
      <HugeiconsIcon icon={PenTool02Icon} size={14} className="text-neutral-400" />
      <span className="thinking-shimmer-text">Writing</span>
      <span className="text-neutral-400 font-mono truncate max-w-[160px]">{title}</span>
    </div>
  );
});
