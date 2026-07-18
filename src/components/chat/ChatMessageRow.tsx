import { memo, useCallback } from 'react';
import { UserBubble } from './UserBubble';
import { AssistantBubble } from './AssistantBubble';
import type { ActionItem } from '@/components/ai/action-summary';

interface ChatMessageRowProps {
  role: string;
  content: string;
  createdAt?: number;
  model?: string;
  files?: any[];
  toolInvocations?: any[];
  reasoning?: string;
  parts?: any[];
  contentBeforeTool?: string;
  contentAfterTool?: string;
  actionSummary?: { summary: string; actions: ActionItem[] } | null;
  isStreaming: boolean;
  isThinkingEnabled?: boolean;
  version: number;
  completionDuration?: number;
  onOpenFile: (file: any) => void;
  onCopy: (content: string) => void;
}

export const ChatMessageRow = memo(function ChatMessageRow({
  role,
  content,
  createdAt,
  model,
  files,
  toolInvocations,
  reasoning,
  parts,
  contentBeforeTool,
  contentAfterTool,
  actionSummary,
  isStreaming,
  isThinkingEnabled,
  version,
  completionDuration,
  onOpenFile,
  onCopy,
}: ChatMessageRowProps) {
  const handleMsgCopy = useCallback(() => onCopy(content), [content, onCopy]);

  const handleOpenMsgFile = useCallback(() => {
    if (files && files.length > 0) {
      onOpenFile(files[0]);
    }
  }, [files, onOpenFile]);

  return (
    <div className={role === 'user' ? 'self-end max-w-[85%]' : 'self-start'}>
      {role === 'user' ? (
        <UserBubble content={content} createdAt={createdAt} model={model} />
      ) : (
        <AssistantBubble
          content={content}
          model={model}
          version={version}
          isStreaming={isStreaming}
          isThinkingEnabled={isThinkingEnabled}
          completionDuration={completionDuration}
          toolInvocations={toolInvocations}
          reasoning={reasoning}
          parts={parts}
          files={files}
          contentBeforeTool={contentBeforeTool}
          contentAfterTool={contentAfterTool}
          actionSummary={actionSummary}
          onOpenFile={
            files && files.length > 0 ? handleOpenMsgFile : undefined
          }
          onCopy={handleMsgCopy}
        />
      )}
    </div>
  );
});
