import { useRef, useCallback, useEffect, useState } from 'react';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { ArrowDown02Icon } from '@hugeicons/core-free-icons';

import { ChatMessageRow } from './ChatMessageRow';
import ChatInput from './ChatInput';
import { IdleState } from './IdleState';

const SCROLL_THRESHOLD = 150;

interface MessageListProps {
  messages: any[];
  currentModel: string | undefined;
  isLoading: boolean;
  lastAssistantIndex: number;
  completionDurations: Record<string, number>;
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
  isWebSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  onOpenFile: (file: any) => void;
  onCopy: (content: string) => void;
  onSend: (content: string) => void;
  onStop: () => void;
  currentMode?: string;
  onModeChange?: (modeId: string | undefined) => void;
  bottomSlot?: React.ReactNode;
}

export function MessageList({
  messages,
  currentModel,
  isLoading,
  lastAssistantIndex,
  completionDurations,
  isThinkingEnabled,
  onToggleThinking,
  isWebSearchEnabled,
  onToggleWebSearch,
  onOpenFile,
  onCopy,
  onSend,
  onStop,
  currentMode,
  onModeChange,
  bottomSlot,
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollFrameRef = useRef<number>(0);

  const handleScroll = useCallback(() => {
    if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (el) {
        const hasOverflow = el.scrollHeight > el.clientHeight;
        if (!hasOverflow) {
          setShowScrollButton(false);
          return;
        }
        const near = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
        isNearBottomRef.current = near;
        setShowScrollButton(!near);
      }
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollToBottomIfNear = () => {
      if (isNearBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    };

    scrollToBottomIfNear();

    const observer = new ResizeObserver(scrollToBottomIfNear);
    observer.observe(el);

    return () => observer.disconnect();
  }, [messages.length]);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        el.scrollBy({ top: 80, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        el.scrollBy({ top: -80, behavior: 'smooth' });
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        el.scrollBy({ top: el.clientHeight * 0.8, behavior: 'smooth' });
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        el.scrollBy({ top: -el.clientHeight * 0.8, behavior: 'smooth' });
      } else if (e.key === 'Home') {
        e.preventDefault();
        el.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (e.key === 'End') {
        e.preventDefault();
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    };

    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        ref={scrollContainerRef}
        tabIndex={0}
        onScroll={handleScroll}
        className="thin-scrollbar outline-none overflow-y-auto flex-1 min-h-0 scroll-smooth"
      >
        <div className="mx-auto flex flex-col px-2 pb-24" style={{ maxWidth: 'min(820px, 100%)' }}>
          {hasMessages && <div className="h-4 w-full shrink-0" />}
          {messages.map((m: any, i: number) => {
            return (
              <ChatMessageRow
                key={m.id || i}
                role={m.role}
                content={m.content}
                createdAt={m.createdAt}
                model={m.model}
                files={m.files}
                toolInvocations={m.toolInvocations}
                reasoning={m.reasoning}
                parts={m.parts}
                contentBeforeTool={m.contentBeforeTool}
                contentAfterTool={m.contentAfterTool}
                actionSummary={m.actionSummary}
                isStreaming={i === lastAssistantIndex}
                isThinkingEnabled={isThinkingEnabled}
                version={1}
                completionDuration={completionDurations[m.id]}
                onOpenFile={onOpenFile}
                onCopy={onCopy}
              />
            );
          })}

          {!hasMessages && (
            <IdleState
              onSend={onSend}
              isLoading={isLoading}
              onStop={onStop}
              isThinkingEnabled={isThinkingEnabled}
              onToggleThinking={onToggleThinking}
              isWebSearchEnabled={isWebSearchEnabled}
              onToggleWebSearch={onToggleWebSearch}
              currentModel={currentModel}
              currentMode={currentMode}
              onModeChange={onModeChange}
            />
          )}
        </div>
      </div>

      {bottomSlot && (
        <div className="shrink-0 mx-auto w-full px-2" style={{ maxWidth: 'min(820px, 100%)' }}>
          {bottomSlot}
        </div>
      )}

      {showScrollButton && hasMessages && (
        <div className="shrink-0 flex justify-center bg-card relative" style={{ height: 0 }}>
          <button
            onClick={scrollToBottom}
            className="absolute left-1/2 -translate-x-1/2 bottom-8 flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-muted text-foreground transition-all shadow-sm z-10"
            title="Scroll to bottom"
          >
            <HugeiconRenderer icon={ArrowDown02Icon} size={18} />
          </button>
        </div>
      )}
      {hasMessages && (
        <ChatInput
          onSend={onSend}
          isLoading={isLoading}
          onStop={onStop}
          isThinkingEnabled={isThinkingEnabled}
          onToggleThinking={onToggleThinking}
          isWebSearchEnabled={isWebSearchEnabled}
          onToggleWebSearch={onToggleWebSearch}
          currentModel={currentModel}
          currentMode={currentMode}
          onModeChange={onModeChange}
        />
      )}
    </div>
  );
}
