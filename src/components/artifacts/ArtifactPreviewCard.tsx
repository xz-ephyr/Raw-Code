import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlayIcon } from '@hugeicons/core-free-icons';

interface ArtifactPreviewCardProps {
  title: string;
  type: string;
  onClick: () => void;
}

export const ArtifactPreviewCard: React.FC<ArtifactPreviewCardProps> = ({
  title,
  type,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="my-4 border border-neutral-200 rounded-xl p-4 bg-white hover:border-neutral-300 transition-all cursor-pointer group shadow-sm hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
          {/* @ts-expect-error - external types */}
          <HugeiconsIcon icon={PlayIcon} size={20} variant="solid" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-neutral-900 truncate">{title}</h3>
          <p className="text-xs text-neutral-500 capitalize">{type}</p>
        </div>
      </div>
    </div>
  );
};
