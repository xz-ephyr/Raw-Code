import { useState, useRef, useEffect, useCallback } from 'react';
import { useSessionTitle } from '@/hooks/useSessionTitle';
import { ChatSessionManager } from '@/services/ChatSessionManager';
import { useParams } from 'react-router-dom';
import { HugeiconRenderer } from '@/components/ui/HugeiconRenderer';
import { MessageAdd01Icon } from '@hugeicons/core-free-icons';
import { ChatContextIndicator } from '@/components/chat/ChatContextIndicator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface TitleBarProps {
  onNewThread?: () => void;
  sessionUsage?: { inputTokens: number; outputTokens: number; reasoningTokens?: number; cachedInputTokens?: number };
  currentModel?: string;
}

export default function TitleBar({ onNewThread, sessionUsage, currentModel }: TitleBarProps) {
  const { sessionTitle, setTitle, isTitleGenerating } = useSessionTitle();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editValue, setEditValue] = useState(sessionTitle);
  const { uuid } = useParams();

  useEffect(() => {
    if (!isEditing) {
      setEditValue(sessionTitle);
    }
  }, [sessionTitle, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    if (!isTitleGenerating) {
      setIsEditing(true);
      setEditValue(sessionTitle);
    }
  }, [sessionTitle, isTitleGenerating]);

  const handleSubmitEdit = useCallback(async () => {
    const newTitle = editValue.trim() || sessionTitle;
    setIsEditing(false);
    if (newTitle !== sessionTitle && uuid) {
      setTitle(newTitle);
      await ChatSessionManager.rename(uuid, newTitle).catch((e) => console.error('Failed to rename session:', e));
    }
  }, [editValue, sessionTitle, uuid, setTitle]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setEditValue(sessionTitle);
      setIsEditing(false);
    }
  }, [sessionTitle]);

  const displayTitle = sessionTitle || 'New conversation';

  return (
    <div className="group flex items-center h-9 px-4 bg-background shrink-0 select-none">
      <div className="flex items-center min-w-0 flex-1">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmitEdit}
            onKeyDown={handleKeyDown}
            className="w-full max-w-[400px] bg-card border border-border rounded-[6px] px-2 py-0.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        ) : isTitleGenerating ? (
          <div className="flex items-center gap-2 w-full">
            <div className="h-3.5 w-44 rounded bg-gradient-to-r from-muted-foreground via-muted to-muted-foreground bg-[length:200%_100%] animate-shimmer" />
            <span className="text-[11px] text-muted-foreground">Generating title...</span>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 min-w-0 cursor-text"
              >
            <span className="text-sm font-semibold text-foreground truncate">{displayTitle}</span>
            <span className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.5 1.5L14.5 4.5L5.5 13.5L1.5 14.5L2.5 10.5L11.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M9 4L12 7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
            </TooltipTrigger>
            <TooltipContent>Click to rename</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <ChatContextIndicator
            usedTokens={(sessionUsage?.inputTokens ?? 0) + (sessionUsage?.outputTokens ?? 0)}
            modelId={currentModel}
            usage={sessionUsage ? { inputTokens: sessionUsage.inputTokens, outputTokens: sessionUsage.outputTokens, totalTokens: sessionUsage.inputTokens + sessionUsage.outputTokens, reasoningTokens: sessionUsage.reasoningTokens, cachedInputTokens: sessionUsage.cachedInputTokens } : undefined}
          />
          {onNewThread && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onNewThread}
                  className="p-1.5 hover:bg-muted rounded-[6px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <HugeiconRenderer icon={MessageAdd01Icon} size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>New thread</TooltipContent>
            </Tooltip>
          )}

        </div>
    </div>
  );
}
