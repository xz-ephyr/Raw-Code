import { useRef, useCallback, useEffect, useState } from 'react';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { ArrowDown02Icon } from '@hugeicons/core-free-icons';
import { ChatMessageRow } from './ChatMessageRow';
import ChatInputContainer from './ChatInputContainer';

const SCROLL_THRESHOLD = 150;

interface MessageListProps {
  messages: any[];
  currentModel: string | undefined;
  isLoading: boolean;
  lastAssistantIndex: number;
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
  onOpenArtifact: (artifact: any) => void;
  onCopy: (content: string) => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onSend: (content: string) => void;
  onStop: () => void;
  onAddProject: () => void;
  currentProjectName: string | undefined;
}

export function MessageList({
  messages,
  currentModel,
  isLoading,
  lastAssistantIndex,
  isThinkingEnabled,
  onToggleThinking,
  onOpenArtifact,
  onCopy,
  onThumbsUp,
  onThumbsDown,
  onSend,
  onStop,
  onAddProject,
  currentProjectName,
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleScroll = useCallback(() => {
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

  return (
    <>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto thin-scrollbar ${!hasMessages ? 'flex flex-col items-center justify-start pt-[15vh] p-4' : ''}`}
      >
        {hasMessages && <div className="h-[8px] bg-[#2a2a2a] w-full shrink-0" />}
        <div className="w-full mx-auto px-4 pb-24" style={{ maxWidth: 'min(880px, 100%)' }}>
          {messages.map((m: any, i: number) => {
            const prevUserContent = i > 0 && messages[i - 1]?.role === 'user'
              ? messages[i - 1]?.content
              : undefined;
            return (
              <ChatMessageRow
                key={m.id || i}
                role={m.role}
                content={m.content}
                artifacts={m.artifacts}
                toolInvocations={m.toolInvocations}
                reasoning={m.reasoning}
                parts={m.parts}
                contentBeforeTool={m.contentBeforeTool}
                contentAfterTool={m.contentAfterTool}
                currentModel={currentModel}
                isStreaming={i === lastAssistantIndex}
                prevUserContent={prevUserContent}
                onOpenArtifact={onOpenArtifact}
                onCopy={onCopy}
                onThumbsUp={onThumbsUp}
                onThumbsDown={onThumbsDown}
                handleSend={onSend}
              />
            );
          })}

          {!hasMessages && (
            <div className="w-full mt-4 flex flex-col items-center overflow-visible pb-10">
              <h1 className="text-[38px] font-serif-source mb-[10px] text-neutral-200 text-center">
                Hello, how can I help?
              </h1>
              <ChatInputContainer
                idle={true}
                onSend={onSend}
                isLoading={isLoading}
                onStop={onStop}
                isThinkingEnabled={isThinkingEnabled}
                onToggleThinking={onToggleThinking}
                onCreateProject={onAddProject}
                currentProjectName={currentProjectName}
                currentModel={currentModel}
              />
            </div>
          )}
        </div>
      </div>

      {showScrollButton && hasMessages && (
        <div className="shrink-0 flex justify-center w-full mx-auto bg-[#2a2a2a] relative" style={{ height: 0 }}>
          <button
            onClick={scrollToBottom}
            className="absolute left-1/2 -translate-x-1/2 bottom-8 flex items-center justify-center w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-all shadow-sm z-10"
            title="Scroll to bottom"
          >
            <HugeiconRenderer icon={ArrowDown02Icon} size={18} />
          </button>
        </div>
      )}

      {hasMessages && (
        <div className="shrink-0 w-full mx-auto px-4 pb-3 bg-[#2a2a2a]">
          <ChatInputContainer
            idle={false}
            onSend={onSend}
            isLoading={isLoading}
            onStop={onStop}
            isThinkingEnabled={isThinkingEnabled}
            onToggleThinking={onToggleThinking}
            onCreateProject={onAddProject}
            currentProjectName={currentProjectName}
            currentModel={currentModel}
          />
        </div>
      )}
    </>
  );
}
