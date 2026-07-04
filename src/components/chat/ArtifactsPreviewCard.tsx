import { HugeiconsIcon } from '@hugeicons/react';
import { GoogleDocIcon, Download01Icon } from '@hugeicons/core-free-icons';
import { ARTIFACT_TYPE_LABELS } from '@/types/artifact';
import type { Artifact } from '@/types/artifact';
import { useCallback } from 'react';

interface ArtifactsPreviewCardProps {
  artifact: Artifact;
  onClick: () => void;
}

export function ArtifactsPreviewCard({ artifact, onClick }: ArtifactsPreviewCardProps) {
  const handleDownload = useCallback(() => {
    const ext = getFileExtension(artifact);
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.identifier}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [artifact]);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className="flex items-center gap-3 w-full h-[75px] px-4 rounded-lg border border-neutral-700 cursor-pointer hover:bg-neutral-800 focus-visible:bg-neutral-800 active:bg-neutral-700 active:scale-[0.98] active:shadow-inner transition-all text-left"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-md text-neutral-400 shrink-0">
        <HugeiconsIcon icon={GoogleDocIcon} size={24} className="-rotate-[15deg]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-200 truncate">
          {artifact.title}
        </div>
        <p className="text-xs text-neutral-400 mt-0.5">
          {ARTIFACT_TYPE_LABELS[artifact.type]} &middot; Click to view
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleDownload();
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 active:bg-neutral-600 active:scale-95 transition-all"
      >
        <HugeiconsIcon icon={Download01Icon} size={16} />
        Download
      </button>
    </div>
  );
}

function getFileExtension(artifact: Artifact): string {
  switch (artifact.type) {
    case 'code': return artifact.language || 'txt';
    case 'html': return 'html';
    case 'react': return 'tsx';
    case 'svg': return 'svg';
    case 'mermaid': return 'mmd';
    case 'markdown': return 'md';
    default: return 'txt';
  }
}
