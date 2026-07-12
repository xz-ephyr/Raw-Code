import React, { useMemo } from 'react';
import { MarkdownMessage } from './MarkdownMessage';
import { ArtifactsPreviewCard } from './ArtifactsPreviewCard';
import { useWriteArtifactStream } from '@/hooks/useWriteArtifactStream';
import { BubbleActions } from './BubbleActions';

interface AssistantBubbleProps {
  content: string;
  isStreaming: boolean;
  version?: number;
  toolInvocations?: any[];
  reasoning?: string;
  parts?: any[];
  artifacts?: any[];
  contentBeforeTool?: string;
  contentAfterTool?: string;
  onOpenArtifact?: (artifact: any) => void;
  onCopy: () => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onRegenerate: () => void;
}

function extractArtifactSummary(content: string): string {
  if (!content) return '';
  const cleaned = content.replace(/^#+\s*/gm, '').trim();
  const paragraphs = cleaned.split(/\n\n+/);
  const firstPara = paragraphs[0] || '';
  return firstPara.length > 350 ? firstPara.slice(0, 347) + '...' : firstPara;
}

export const AssistantBubble = React.memo(
  ({
    content,
    isStreaming,
    version,
    toolInvocations,
    artifacts,
    contentBeforeTool,
    contentAfterTool,
    onOpenArtifact,
    onCopy,
    onThumbsUp,
    onThumbsDown,
    onRegenerate,
  }: AssistantBubbleProps) => {
    const hasWriteArtifact = toolInvocations?.some((ti) => ti.toolName === 'write_artifact');
    const artifactCall = hasWriteArtifact
      ? toolInvocations?.find((ti) => ti.toolName === 'write_artifact')
      : null;
    const artifactTitle =
      artifactCall?.args?.title ||
      artifactCall?.args?.identifier ||
      artifacts?.[0]?.title ||
      artifacts?.[0]?.identifier ||
      '';
    const artifactContent = artifactCall?.args?.content || artifacts?.[0]?.content || '';
    const artifactSummary = useMemo(() => extractArtifactSummary(artifactContent), [artifactContent]);

    const isToolDone = !hasWriteArtifact || toolInvocations?.every(
      (ti) => ti.toolName !== 'write_artifact' || ti.state === 'result',
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
      <div className="mb-6 w-full group/bubble">
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

              {phase === 'done' && artifactSummary && (
                <div className="text-xs text-muted-foreground/80 leading-relaxed">
                  {artifactSummary}
                </div>
              )}

              {phase === 'done' && contentAfterTool && (
                <div className="font-normal text-foreground leading-[1.2]">
                  <MarkdownMessage content={contentAfterTool} sources={[]} />
                </div>
              )}
            </>
          ) : (
            content && (
              <div className="font-normal text-foreground leading-[1.2]">
                <MarkdownMessage content={content} sources={[]} />
              </div>
            )
          )}
        </div>

        {phase === 'done' && artifacts && artifacts.length > 0 && onOpenArtifact && (
          <div className="px-4 pb-2">
            <ArtifactsPreviewCard
              artifact={artifacts[0]}
              onClick={() => onOpenArtifact(artifacts[0])}
            />
          </div>
        )}

        {showFooterActions && (
          <BubbleActions
            allSources={[]}
            version={version}
            onCopy={onCopy}
            onThumbsUp={onThumbsUp}
            onThumbsDown={onThumbsDown}
            onRegenerate={onRegenerate}
          />
        )}
      </div>
    );
  }
);
