import React, { useState, useRef, useEffect } from 'react';
import { MarkdownMessage } from './MarkdownMessage';
import { ArtifactsPreviewCard } from './ArtifactsPreviewCard';
import { ThoughtLabel } from './ThoughtLabel';
import {
  ThinkingTimeline,
  useTimelineSteps,
  useAggregatedSources,
} from './ThinkingTimeline';
import { useWriteArtifactStream } from '@/hooks/useWriteArtifactStream';
import { BubbleActions } from './BubbleActions';

interface AssistantBubbleProps {
  content: string;
  isStreaming: boolean;
  model?: string;
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

export const AssistantBubble = React.memo(
  ({
    content,
    isStreaming,
    model,
    toolInvocations,
    reasoning,
    parts,
    artifacts,
    contentBeforeTool,
    contentAfterTool,
    onOpenArtifact,
    onCopy,
    onThumbsUp,
    onThumbsDown,
    onRegenerate,
  }: AssistantBubbleProps) => {
    const [isReasoningOpen, setIsReasoningOpen] = useState(false);

    const hasWriteArtifact = toolInvocations?.some((ti) => ti.toolName === 'writeArtifact');

    const timelineSteps = useTimelineSteps(reasoning, toolInvocations, isStreaming, parts, !!content);
    const hasTimeline = timelineSteps.length > 0;
    const allSources = useAggregatedSources(toolInvocations);

    const {
      phase,
      streamedIntention,
      streamedExplanation,
    } = useWriteArtifactStream(!!hasWriteArtifact, contentBeforeTool, contentAfterTool, content);

    const hasPendingSearch = toolInvocations?.some(
      (ti) => ti.toolName !== 'writeArtifact' && ti.state !== 'result',
    );
    const showFooterActions = !isStreaming && !hasPendingSearch;

    const timelineScrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if (isStreaming && timelineScrollRef.current) {
        requestAnimationFrame(() => {
          timelineScrollRef.current?.scrollTo(0, timelineScrollRef.current.scrollHeight);
        });
      }
    }, [reasoning, toolInvocations, isStreaming]);

    return (
      <div className="mb-6 w-full group/bubble">
        <div className="text-base px-4 break-words flex flex-col gap-0">
          {hasTimeline && (
            <>
              <ThoughtLabel
                isActivelyThinking={isStreaming && !hasPendingSearch && !content}
                isOpen={isReasoningOpen}
                onClick={() => setIsReasoningOpen((p) => !p)}
              />
              <div
                className={`grid ${
                  isReasoningOpen
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden min-h-0">
                  <div
                    ref={timelineScrollRef}
                    className="overflow-y-auto no-scrollbar flex flex-col gap-2 max-h-[45vh]"
                  >
                    <ThinkingTimeline
                      steps={timelineSteps}
                      isStreaming={isStreaming}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {phase !== 'idle' ? (
            <>
              {streamedIntention && (
                <div className="font-normal text-neutral-900 stagger-item stagger-0 leading-[1.2]">
                  <MarkdownMessage content={streamedIntention} sources={allSources} />
                </div>
              )}
              {(phase === 'explanation' || phase === 'done') && streamedExplanation && (
                <div className="font-normal text-neutral-900 stagger-item stagger-2 leading-[1.2]">
                  <MarkdownMessage content={streamedExplanation} sources={allSources} />
                </div>
              )}
            </>
          ) : content && (
            <div className="font-normal text-neutral-900 leading-[1.2]">
              <MarkdownMessage content={content} sources={allSources} />
            </div>
          )}
        </div>

        {artifacts && artifacts.length > 0 && !isStreaming && onOpenArtifact && (
          <div className="px-4 pb-2">
            <ArtifactsPreviewCard
              artifact={artifacts[0]}
              onClick={() => onOpenArtifact(artifacts[0])}
            />
          </div>
        )}

        {showFooterActions && (
          <BubbleActions
            allSources={allSources}
            model={model}
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
