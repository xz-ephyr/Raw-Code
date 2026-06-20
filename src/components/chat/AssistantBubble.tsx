import React, { useState } from 'react';
import { MarkdownMessage } from './MarkdownMessage';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  ArrowTurnBackwardIcon,
  Copy01Icon,
  Tick01Icon,
} from '@hugeicons/core-free-icons';
import { ArtifactPreviewCard } from '../artifacts/ArtifactPreviewCard';

const HugeiconRenderer = ({
  icon: Icon,
  size = 14,
  className,
}: {
  icon: any;
  size?: number;
  className?: string;
}) => (
  <HugeiconsIcon
    icon={Icon}
    size={size}
    color="currentColor"
    strokeWidth={1.5}
    className={className}
  />
);

interface ArtifactCardData {
  title: string;
  type: string;
  artifactId: string;
}

interface AssistantBubbleProps {
  content: string;
  isStreaming: boolean;
  model?: string;
  toolInvocations?: any[];
  reasoning?: string;
  artifactCards?: ArtifactCardData[];
  onArtifactClick?: (artifactId: string) => void;
  onCopy: () => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onRegenerate: () => void;
  estimatedTokens?: number;
}

const ThoughtLabel = ({
  isActivelyThinking,
  isOpen,
  onClick,
}: {
  isActivelyThinking: boolean;
  isOpen: boolean;
  onClick: () => void;
}) => {
  const [seconds, setSeconds] = useState(0);

  React.useEffect(() => {
    if (!isActivelyThinking) return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, [isActivelyThinking]);

  const displayTime = seconds > 0 ? `${seconds.toFixed(1)}s` : '';
  const label = isActivelyThinking ? `Thinking... ${displayTime}` : `Thought ${displayTime}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center bg-transparent p-0 text-left outline-none w-fit"
      aria-expanded={isOpen}
    >
      <span
        className={
          isActivelyThinking
            ? 'thinking-shimmer-text text-base font-medium cursor-pointer'
            : 'text-base font-medium text-neutral-400 cursor-pointer'
        }
      >
        {label}
      </span>
    </button>
  );
};

export const AssistantBubble = React.memo(
  ({
    content,
    isStreaming,
    model,
    toolInvocations,
    reasoning,
    artifactCards,
    onArtifactClick,
    onCopy,
    onThumbsUp,
    onThumbsDown,
    onRegenerate,
    estimatedTokens,
  }: AssistantBubbleProps) => {
    const [isReasoningOpen, setIsReasoningOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const hasPendingTool = toolInvocations?.some((ti) => ti.state !== 'result');
    const showThinking = isStreaming && !content;

    const artifactTool = toolInvocations?.find((ti) => ti.toolName === 'create_artifact');
    const isArtifactGenerating = artifactTool && artifactTool.state !== 'result';
    const intentMessage = artifactTool?.args?.intent_message;

    const showThought = (reasoning && !isStreaming) || (isStreaming && !content);

    return (
      <div className="mb-6 w-full">
        <div className="text-base px-4 py-4 break-words flex flex-col gap-2">
          {intentMessage && (
            <div className="font-medium text-neutral-800 mb-1">{intentMessage}</div>
          )}

          {isArtifactGenerating && (
            <div className="flex items-center gap-2 text-neutral-500 italic">
              <span className="thinking-shimmer-text">⏳ Generating application...</span>
            </div>
          )}

          {showThought && (
            <div className="flex flex-col gap-2">
              <ThoughtLabel
                isActivelyThinking={showThinking}
                isOpen={isReasoningOpen}
                onClick={() => setIsReasoningOpen(!isReasoningOpen)}
              />
              {isReasoningOpen && reasoning && (
                <div className="w-full whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-neutral-500 thin-scrollbar pt-1">
                  {reasoning}
                </div>
              )}
            </div>
          )}

          {content && (
            <div className="font-medium text-neutral-900">
              <MarkdownMessage content={content} />
            </div>
          )}
        </div>

        {artifactCards?.map((card) => (
          <ArtifactPreviewCard
            key={card.artifactId}
            title={card.title}
            type={card.type}
            onClick={() => onArtifactClick?.(card.artifactId)}
          />
        ))}

        {!isStreaming && !hasPendingTool && (
          <div className="flex items-center justify-between gap-3 text-gray-600 px-4">
            {model && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">{model}</span>
                {estimatedTokens !== undefined && (
                  <span className="text-[10px] text-gray-400">(~{estimatedTokens} tokens)</span>
                )}
              </div>
            )}
            <div className="flex gap-3 items-center ml-auto">
              <button
                onClick={handleCopy}
                className="hover:text-black transition-colors"
                title="Copy response"
              >
                <HugeiconRenderer
                  icon={copied ? Tick01Icon : Copy01Icon}
                  size={18}
                  className={copied ? 'text-green-600' : ''}
                />
              </button>
              <button onClick={onThumbsUp} className="hover:text-black transition-colors">
                <HugeiconRenderer icon={ThumbsUpIcon} size={18} />
              </button>
              <button onClick={onThumbsDown} className="hover:text-black transition-colors">
                <HugeiconRenderer icon={ThumbsDownIcon} size={18} />
              </button>
              <button onClick={onRegenerate} className="hover:text-black transition-colors">
                <HugeiconRenderer icon={ArrowTurnBackwardIcon} size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
