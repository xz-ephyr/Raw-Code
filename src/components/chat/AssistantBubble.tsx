import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MarkdownMessage } from './MarkdownMessage';
import { HugeiconsIcon } from '@hugeicons/react';
import { useThinkingTimer } from '../../hooks/useThinkingTimer';
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

const ToolCallPill = ({ toolName, state, args }: { toolName: string; state: string; args: any }) => {
  const getVerb = () => {
    switch (toolName) {
      case 'read_file':
        return state === 'result' ? 'read' : 'reading';
      case 'write_file':
      case 'create_artifact':
        return state === 'result' ? 'wrote' : 'writing';
      case 'edit_file':
        return state === 'result' ? 'edited' : 'editing';
      case 'grep_tool':
        return 'grep';
      case 'list_dir':
        return state === 'result' ? 'listed' : 'listing';
      default:
        return state === 'result' ? 'used' : 'using';
    }
  };

  const fileName = args?.file_path || args?.path || args?.title || args?.filename || '';

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-100 rounded-[6px] text-xs font-medium text-neutral-600 border border-neutral-200 w-fit shrink-0">
      <span className="capitalize">{getVerb()}</span>
      {fileName && <span className="text-neutral-400 font-mono truncate max-w-[200px]">{fileName}</span>}
    </div>
  );
};

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
  const { label } = useThinkingTimer(isActivelyThinking);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center bg-transparent p-0 text-left outline-none w-fit transition-all"
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
    const [isReasoningOpen, setIsReasoningOpen] = useState(isStreaming);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
      if (!isStreaming) {
        setIsReasoningOpen(false);
      }
    }, [isStreaming]);

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

    const showThought = reasoning || isStreaming;
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (isStreaming && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [reasoning, toolInvocations, isStreaming]);

    // Split reasoning into sentences for the 1-2 sentence intent constraint
    const sentences = useMemo(() => {
      if (!reasoning) return [];
      return reasoning
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.trim().length > 0)
        .slice(0, 50); // Limit to avoid performance issues
    }, [reasoning]);

    return (
      <div className="mb-6 w-full group/bubble">
        <div className="text-base px-4 py-4 break-words flex flex-col gap-2">
          {intentMessage && (
            <div className="font-medium text-neutral-800 mb-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
              {intentMessage}
            </div>
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

              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                  isReasoningOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div
                    ref={scrollRef}
                    className="h-[45px] overflow-y-auto no-scrollbar thinking-pad-mask relative flex flex-col gap-2 pt-1"
                  >
                    {sentences.map((s, idx) => (
                      <div
                        key={idx}
                        className="text-[15px] leading-relaxed text-neutral-500 animate-in fade-in slide-in-from-bottom-2 duration-300"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {s}
                      </div>
                    ))}
                    {toolInvocations && toolInvocations.length > 0 && (
                      <div className="flex flex-wrap gap-2 pb-4">
                        {toolInvocations.map((ti, idx) => (
                          <ToolCallPill
                            key={ti.toolCallId || idx}
                            toolName={ti.toolName}
                            state={ti.state}
                            args={ti.args}
                          />
                        ))}
                      </div>
                    )}
                    {!reasoning && isStreaming && (
                      <p className="text-[15px] text-neutral-400 animate-pulse">Thinking...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {content && (
            <div className="font-medium text-neutral-900 animate-in fade-in duration-500">
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
