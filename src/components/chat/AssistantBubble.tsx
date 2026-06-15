import React from 'react';
import { MarkdownMessage } from './MarkdownMessage';
import { ThinkingIndicator } from './ThinkingIndicator';
import { HugeiconsIcon } from '@hugeicons/react';
import { ThumbsUpIcon, ThumbsDownIcon, ArrowTurnBackwardIcon, Copy01Icon } from '@hugeicons/core-free-icons';

const HugeiconRenderer = ({ icon: Icon, size = 14, className }: { icon: any, size?: number, className?: string }) => (
  <HugeiconsIcon icon={Icon} size={size} color="currentColor" strokeWidth={1.5} className={className} />
);

interface AssistantBubbleProps {
  content: string;
  isStreaming: boolean;
  model?: string;
  toolInvocations?: any[];
}

export const AssistantBubble = React.memo(({ content, isStreaming, model, toolInvocations }: AssistantBubbleProps) => {
  const showThinking = isStreaming && !content.trim() && (!toolInvocations || toolInvocations.length === 0);

  const artifactTool = toolInvocations?.find(ti => ti.toolName === 'create_artifact');
  const isArtifactGenerating = artifactTool && artifactTool.state !== 'result';
  const intentMessage = artifactTool?.args?.intent_message;

  return (
    <div className="mb-6 w-full">
      {showThinking ? (
        <ThinkingIndicator model={model} />
      ) : (
        <div className="text-sm py-4 break-words [overflow-wrap:anywhere] flex flex-col gap-2">
          {intentMessage && (
            <div className="font-medium text-neutral-800 mb-1">
              {intentMessage}
            </div>
          )}

          {isArtifactGenerating && (
            <div className="flex items-center gap-2 text-neutral-500 italic">
               <span className="thinking-shimmer-text">⏳ Generating application...</span>
            </div>
          )}

          {content && <MarkdownMessage content={content} />}
        </div>
      )}

      {!isStreaming && !isArtifactGenerating && (
        <div className="flex items-center justify-between gap-3 text-gray-600 -ml-1">
          <div className="flex gap-3 items-center">
            <button className="hover:text-black transition-colors"><HugeiconRenderer icon={Copy01Icon} size={18} /></button>
            <button className="hover:text-black transition-colors"><HugeiconRenderer icon={ThumbsUpIcon} size={18} /></button>
            <button className="hover:text-black transition-colors"><HugeiconRenderer icon={ThumbsDownIcon} size={18} /></button>
            <button className="hover:text-black transition-colors"><HugeiconRenderer icon={ArrowTurnBackwardIcon} size={18} /></button>
          </div>
          {model && <span className="text-xs text-gray-400">{model}</span>}
        </div>
      )}
    </div>
  );
});
