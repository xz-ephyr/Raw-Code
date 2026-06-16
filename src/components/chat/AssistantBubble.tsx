import React, { useState } from 'react';
import { MarkdownMessage } from './MarkdownMessage';
import { ThinkingIndicator } from './ThinkingIndicator';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  ArrowTurnBackwardIcon,
  Copy01Icon,
  ArrowDown01Icon,
  Idea01Icon,
} from '@hugeicons/core-free-icons';

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

interface AssistantBubbleProps {
  content: string;
  isStreaming: boolean;
  model?: string;
  toolInvocations?: any[];
  reasoning?: string;
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
    onCopy,
    onThumbsUp,
    onThumbsDown,
    onRegenerate,
  }: AssistantBubbleProps) => {
    const [isReasoningOpen, setIsReasoningOpen] = useState(false);
    
    const hasPendingTool = toolInvocations?.some((ti) => ti.state !== 'result');
    const showThinking = isStreaming && !content.trim() && !hasPendingTool;

    const artifactTool = toolInvocations?.find((ti) => ti.toolName === 'create_artifact');
    const isArtifactGenerating = artifactTool && artifactTool.state !== 'result';
    const intentMessage = artifactTool?.args?.intent_message;

    return (
      <div className="mb-6 w-full">
        {showThinking ? (
          <ThinkingIndicator model={model} reasoning={reasoning} />
        ) : (
          <div className="text-base py-4 break-words [overflow-wrap:anywhere] flex flex-col gap-2">
            {intentMessage && (
              <div className="font-medium text-neutral-800 mb-1">{intentMessage}</div>
            )}

            {isArtifactGenerating && (
              <div className="flex items-center gap-2 text-neutral-500 italic">
                <span className="thinking-shimmer-text">⏳ Generating application...</span>
              </div>
            )}
            
            {reasoning && (
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <button 
                  onClick={() => setIsReasoningOpen(!isReasoningOpen)}
                  className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-neutral-600 bg-neutral-50 hover:bg-neutral-100"
                >
                  <span className="flex items-center gap-2">
                    <HugeiconRenderer icon={Idea01Icon} size={14} /> 
                    {isReasoningOpen ? 'Hide' : 'Show'} reasoning
                  </span>
                  <HugeiconRenderer icon={ArrowDown01Icon} size={12} className={isReasoningOpen ? 'rotate-180' : ''} />
                </button>
                {isReasoningOpen && (
                  <div className="px-3 py-2 text-neutral-600 bg-white border-t border-neutral-100 text-xs whitespace-pre-wrap">
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
        )}

        {!isStreaming && !isArtifactGenerating && (
          <div className="flex items-center justify-between gap-3 text-gray-600 -ml-1">
            <div className="flex gap-3 items-center">
              <button onClick={onCopy} className="hover:text-black transition-colors">
                <HugeiconRenderer icon={Copy01Icon} size={18} />
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
            {model && <span className="text-xs text-gray-400">{model}</span>}
          </div>
        )}
      </div>
    );
  }
);
