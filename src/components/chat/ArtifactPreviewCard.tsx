import { CodeIcon, EyeIcon } from '../artifact/icons';
import { ARTIFACT_TYPE_LABELS } from '../../types/artifact';
import type { Artifact } from '../../types/artifact';

interface ArtifactPreviewCardProps {
  isStreaming: boolean;
  artifact?: Artifact | null;
}

export function ArtifactPreviewCard({ isStreaming, artifact }: ArtifactPreviewCardProps) {
  const title = artifact?.title || 'Artifact';
  const typeLabel = artifact ? ARTIFACT_TYPE_LABELS[artifact.type] : 'Code';
  const subtitle = isStreaming
    ? `Creating ${typeLabel.toLowerCase()}...`
    : `${typeLabel} ready`;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/50">
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
        <CodeIcon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
            {title}
          </span>
          {isStreaming && (
            <span className="inline-flex gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {subtitle}
        </p>
      </div>
      <EyeIcon size={16} />
    </div>
  );
}
