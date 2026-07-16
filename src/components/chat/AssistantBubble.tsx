import React, { useMemo, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';
import { FilePreviewCard } from './FilePreviewCard';
import { useWriteArtifactStream } from '@/hooks/useWriteArtifactStream';
import { BubbleActions } from './BubbleActions';
import { BubbleDropdown } from './BubbleDropdown';
import { ReasoningModal } from './ReasoningModal';

interface AssistantBubbleProps {
  content: string;
  isStreaming: boolean;
  model?: string;
  completionDuration?: number;
  version?: number;
  toolInvocations?: any[];
  reasoning?: string;
  parts?: any[];
  files?: any[];
  contentBeforeTool?: string;
  contentAfterTool?: string;
  onOpenFile?: (file: any) => void;
  onCopy: () => void;
}

function extractFileSummary(content: string): string {
  if (!content) return '';
  const cleaned = content.replace(/^#+\s*/gm, '').trim();
  const paragraphs = cleaned.split(/\n\n+/);
  const firstPara = paragraphs[0] || '';
  return firstPara.length > 350 ? firstPara.slice(0, 347) + '...' : firstPara;
}

const ARTIFACT_TOOL_NAMES = new Set([
  'write_artifact', 'write_article', 'edit_text', 'research', 'generate_script',
]);

export const AssistantBubble = React.memo(
  ({
    content,
    isStreaming,
    model,
    version,
    completionDuration,
    toolInvocations,
    files,
    contentBeforeTool,
    contentAfterTool,
    reasoning,
    onOpenFile,
    onCopy,
  }: AssistantBubbleProps) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showReasoningModal, setShowReasoningModal] = useState(false);
    const hasWriteArtifact = toolInvocations?.some((ti) => ARTIFACT_TOOL_NAMES.has(ti.toolName));
    const artifactCall = hasWriteArtifact
      ? toolInvocations?.find((ti) => ti.toolName === 'write_artifact')
      : null;
    const artifactTitle =
      artifactCall?.args?.title ||
      artifactCall?.args?.identifier ||
      files?.[0]?.title ||
      files?.[0]?.identifier ||
      '';
    const artifactContent = artifactCall?.args?.content || files?.[0]?.content || '';
    const artifactSummary = useMemo(() => extractFileSummary(artifactContent), [artifactContent]);

    const isToolDone = !hasWriteArtifact || toolInvocations?.every(
      (ti) => !ARTIFACT_TOOL_NAMES.has(ti.toolName) || ti.state === 'result',
    );

    const {
      phase,
      streamedIntention,
    } = useWriteArtifactStream(!!hasWriteArtifact, contentBeforeTool, isToolDone);

    const hasPendingSearch = toolInvocations?.some(
      (ti) => ti.toolName !== 'write_artifact' && ti.state !== 'result',
    );
    const showFooterActions = !isStreaming && !hasPendingSearch;

    const showWritingLine = hasWriteArtifact && artifactTitle && (
      phase === 'intention' || phase === 'writing'
    );

    return (
      <div className="mb-10 w-full group/bubble">
        <div className="text-base px-4 break-words flex flex-col gap-1">
          {hasWriteArtifact ? (
            <>
              {phase === 'intention' && streamedIntention && (
                <div className="font-normal text-foreground stagger-item stagger-0 leading-[1.2]">
                  <MarkdownMessage content={streamedIntention} sources={[]} />
                </div>
              )}

              {(phase === 'writing' || phase === 'done') && contentBeforeTool && (
                <div className="font-normal text-foreground leading-[1.2]">
                  <MarkdownMessage content={contentBeforeTool} sources={[]} />
                </div>
              )}

              {showWritingLine && (
                <div className={`text-xs ${phase === 'writing' ? 'writing-shimmer-text' : 'text-muted-foreground'}`}>
                  writing — {artifactTitle}
                </div>
              )}

              {phase === 'done' && artifactSummary && !contentAfterTool && (
                <div className="text-xs text-muted-foreground/80 leading-relaxed">
                  {artifactSummary}
                </div>
              )}

              {phase === 'done' && contentAfterTool && (
                <div className="font-normal text-foreground leading-[1.2]">
                  <MarkdownMessage content={contentAfterTool} sources={[]} />
                </div>
              )}

              {phase === 'done' && !contentBeforeTool && !contentAfterTool && content && (
                <div className="font-normal text-foreground leading-[1.2]">
                  <MarkdownMessage content={content} sources={[]} />
                </div>
              )}
            </>
          ) : (
            content ? (
              <div className="font-normal text-foreground leading-[1.2]">
                <MarkdownMessage content={content} sources={[]} />
              </div>
            ) : isStreaming ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-sm">Thinking...</span>
              </div>
            ) : null
          )}
        </div>

        {phase === 'done' && files && files.length > 0 && onOpenFile && (
          <div className="px-4 pb-2">
            <FilePreviewCard
              file={files[0]}
              onClick={() => onOpenFile(files[0])}
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 px-4 mt-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity" style={{ userSelect: 'none' }}>
          {showFooterActions && (
            <>
              <BubbleActions
                allSources={[]}
                version={version}
                onCopy={onCopy}
              />
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="relative p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MoreHorizontal size={14} />
                  <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${reasoning ? 'bg-green-500' : 'bg-gray-400'}`} />
                </button>
                {showDropdown && (
                  <BubbleDropdown
                    onShowReasoning={reasoning ? () => {
                      setShowDropdown(false);
                      setShowReasoningModal(true);
                    } : undefined}
                    onClose={() => setShowDropdown(false)}
                  />
                )}
              </div>
            </>
          )}
          {model && (
            <span className="text-[11px] font-medium text-muted-foreground select-none whitespace-nowrap truncate max-w-[120px]">{model}</span>
          )}
          {completionDuration !== undefined && (
            <span className="text-[11px] text-muted-foreground/60">
              {(completionDuration / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {showReasoningModal && reasoning && (
          <ReasoningModal
            reasoning={reasoning}
            onClose={() => setShowReasoningModal(false)}
          />
        )}
      </div>
    );
  }
);
