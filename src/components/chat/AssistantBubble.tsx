import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MarkdownMessage } from './MarkdownMessage';
import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  ArrowTurnBackwardIcon,
  Copy01Icon,
  Tick01Icon,
  Clock01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { ThoughtLabel } from './ThoughtLabel';
import { ArtifactsPreviewCard } from './ArtifactsPreviewCard';
import { WritingToolShimmer } from './WritingToolShimmer';

interface AssistantBubbleProps {
  content: string;
  isStreaming: boolean;
  model?: string;
  toolInvocations?: any[];
  reasoning?: string;
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
    const [copied, setCopied] = useState(false);

    const hasPendingTool = toolInvocations?.some((ti) => ti.state !== 'result');
    const hasWriteArtifact = toolInvocations?.some((ti) => ti.toolName === 'writeArtifact');
    const hasOtherPendingTool = toolInvocations?.some((ti) => ti.toolName !== 'writeArtifact' && ti.state !== 'result');

    // ── Simulated streaming sequence ──
    const [phase, setPhase] = useState<'idle' | 'intention' | 'shimmer' | 'explanation' | 'done'>('idle');
    const [intentionLen, setIntentionLen] = useState(0);
    const [explanationLen, setExplanationLen] = useState(0);
    const prevIntentionRef = useRef('');
    const prevExplanationRef = useRef('');

    // Advance phase state machine
    useEffect(() => {
      if (!hasWriteArtifact || !contentBeforeTool) return;
      if (phase === 'idle') {
        if (content && content.startsWith(contentBeforeTool)) {
          setIntentionLen(contentBeforeTool.length);
          if (contentAfterTool && content.includes(contentAfterTool)) {
            setExplanationLen(contentAfterTool.length);
            setPhase('done');
            return;
          }
          setPhase('shimmer');
          return;
        }
        setPhase('intention');
      }
    }, [hasWriteArtifact, contentBeforeTool, phase, content, contentAfterTool]);

    useEffect(() => {
      if (phase !== 'intention' || !contentBeforeTool) return;
      const total = contentBeforeTool.length;
      if (total === 0) { setPhase('shimmer'); return; }
      if (intentionLen >= total) { setPhase('shimmer'); return; }
      // Text grew (natural streaming) → show all immediately
      if (contentBeforeTool !== prevIntentionRef.current && prevIntentionRef.current !== '') {
        prevIntentionRef.current = contentBeforeTool;
        setIntentionLen(total);
        return;
      }
      prevIntentionRef.current = contentBeforeTool;
      // First arrival with no prior content → buffered, simulate streaming
      const step = Math.max(1, Math.floor(total / 60));
      const t = setTimeout(() => setIntentionLen(l => Math.min(l + step, total)), 25);
      return () => clearTimeout(t);
    }, [phase, contentBeforeTool, intentionLen]);

    useEffect(() => {
      if (phase !== 'shimmer') return;
      setExplanationLen(0);
      const t = setTimeout(() => setPhase('explanation'), 600);
      return () => clearTimeout(t);
    }, [phase]);

    useEffect(() => {
      if (phase !== 'explanation' || !contentAfterTool) return;
      const total = contentAfterTool.length;
      if (total === 0) { setPhase('done'); return; }
      if (explanationLen >= total) { setPhase('done'); return; }
      if (contentAfterTool !== prevExplanationRef.current && prevExplanationRef.current !== '') {
        prevExplanationRef.current = contentAfterTool;
        setExplanationLen(total);
        return;
      }
      prevExplanationRef.current = contentAfterTool;
      const step = Math.max(1, Math.floor(total / 60));
      const t = setTimeout(() => setExplanationLen(l => Math.min(l + step, total)), 25);
      return () => clearTimeout(t);
    }, [phase, contentAfterTool, explanationLen]);

    const streamedIntention = contentBeforeTool?.slice(0, intentionLen) || '';
    const streamedExplanation = contentAfterTool?.slice(0, explanationLen) || '';

    const handleCopy = () => {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const showThinking = isStreaming && !content;

    const pendingTools = toolInvocations?.filter((ti) => ti.state !== 'result') || [];

    const showThought = !!reasoning;
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (isStreaming && scrollRef.current) {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
      }
    }, [reasoning, toolInvocations, isStreaming]);

    const sentences = useMemo(() => {
      if (!reasoning) return [];
      return reasoning
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.trim().length > 0)
        .slice(0, 50);
    }, [reasoning]);

  return (
    <div className="mb-6 w-full group/bubble">
      <div className="text-base px-4 py-4 break-words flex flex-col gap-2">
        {hasOtherPendingTool && (
          <div className="flex items-center gap-2 text-neutral-500">
            {pendingTools.filter((ti) => ti.toolName !== 'writeArtifact').map((ti) => {
              const fileName = ti.args?.file_path || ti.args?.path || ti.args?.title || ti.args?.filename || '';
              return (
                <div key={ti.toolCallId} className="flex items-center gap-1.5 px-2 py-1 bg-neutral-50 rounded-[6px] text-xs font-medium text-neutral-500 border border-neutral-200">
                  <span className="thinking-shimmer-text capitalize">
                    {ti.state === 'result' ? 'done' : 'running'}
                  </span>
                  {fileName && <span className="text-neutral-400 font-mono truncate max-w-[160px]">{fileName}</span>}
                </div>
              );
            })}
          </div>
        )}

        {isStreaming && !reasoning && !hasPendingTool && !hasWriteArtifact && !content && (
          <div className="flex items-center gap-2 text-neutral-400">
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        {showThought && (
          <div className="flex flex-col gap-2">
            <ThoughtLabel
              isActivelyThinking={showThinking}
              isOpen={isReasoningOpen}
              onClick={() => setIsReasoningOpen(!isReasoningOpen)}
            />

            <div className="flex gap-3">
              {isReasoningOpen && (
                <div className="flex flex-col items-center shrink-0">
                  <div className="flex items-center justify-center w-5 h-5">
                    <HugeiconsIcon icon={Clock01Icon} size={14} className="text-neutral-400" />
                  </div>
                  <div className="w-0.5 flex-1 min-h-4 bg-neutral-200 mt-1" />
                </div>
              )}

              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div
                  className={`grid ${isReasoningOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className="overflow-hidden">
                    <div
                      ref={scrollRef}
                      className="overflow-y-auto no-scrollbar flex flex-col gap-2 pt-1"
                    >
                      {sentences.map((s, idx) => (
                        <div
                          key={idx}
                          className="text-[15px] leading-relaxed text-neutral-500"
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase !== 'idle' ? (
          <>
            {streamedIntention && (
              <div className="font-normal text-neutral-900 stagger-item stagger-0">
                <MarkdownMessage content={streamedIntention} />
              </div>
            )}
            {(phase === 'shimmer' || phase === 'explanation' || phase === 'done') && hasWriteArtifact && (
              <div className="flex items-center gap-2 text-neutral-500 stagger-item stagger-1">
                {toolInvocations?.filter((ti) => ti.toolName === 'writeArtifact').map((ti) => (
                  <WritingToolShimmer
                    key={ti.toolCallId}
                    title={ti.args?.title || ti.args?.identifier || ''}
                    done={ti.state === 'result'}
                  />
                ))}
              </div>
            )}
            {(phase === 'explanation' || phase === 'done') && streamedExplanation && (
              <div className="font-normal text-neutral-900 stagger-item stagger-2">
                <MarkdownMessage content={streamedExplanation} />
              </div>
            )}
          </>
        ) : content && (
          <div className="font-normal text-neutral-900">
            <MarkdownMessage content={content} />
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

        {!isStreaming && !hasOtherPendingTool && (
          <div className="flex items-center gap-3 text-gray-600 px-4">
            <button
              type="button"
              onClick={handleCopy}
              className="hover:text-black transition-colors"
              title={copied ? 'Copied!' : 'Copy response'}
              aria-label={copied ? 'Copied!' : 'Copy response'}
            >
              <HugeiconRenderer
                icon={copied ? Tick01Icon : Copy01Icon}
                size={18}
                className={copied ? 'text-green-600' : ''}
              />
            </button>
            <button
              type="button"
              onClick={onThumbsUp}
              className="hover:text-black transition-colors"
              title="Good response"
              aria-label="Good response"
            >
              <HugeiconRenderer icon={ThumbsUpIcon} size={18} />
            </button>
            <button
              type="button"
              onClick={onThumbsDown}
              className="hover:text-black transition-colors"
              title="Bad response"
              aria-label="Bad response"
            >
              <HugeiconRenderer icon={ThumbsDownIcon} size={18} />
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              className="hover:text-black transition-colors"
              title="Regenerate response"
              aria-label="Regenerate response"
            >
              <HugeiconRenderer icon={ArrowTurnBackwardIcon} size={18} />
            </button>
            {model && (
              <span className="text-xs text-gray-400 ml-1">{model}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);
