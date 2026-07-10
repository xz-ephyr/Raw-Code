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
  isWebSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  onOpenArtifact: (artifact: any) => void;
  onCopy: (content: string) => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onSend: (content: string) => void;
  onRegenerate: (index: number) => void;
  onStop: () => void;
  onAddProject: () => void;
  onOpenIDE?: () => void;
  currentProjectName: string | undefined;
  currentMode?: string;
  onModeChange?: (modeId: string | undefined) => void;
  isProject?: boolean;
  bottomSlot?: React.ReactNode;
}

export function MessageList({
  messages,
  currentModel,
  isLoading,
  lastAssistantIndex,
  isThinkingEnabled,
  onToggleThinking,
  isWebSearchEnabled,
  onToggleWebSearch,
  onOpenArtifact,
  onCopy,
  onThumbsUp,
  onThumbsDown,
  onSend,
  onRegenerate,
  onStop,
  onAddProject,
  onOpenIDE,
  currentProjectName,
  currentMode,
  onModeChange,
  isProject,
  bottomSlot,
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [versionMap, setVersionMap] = useState<Record<string, number>>({});

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

  const handleLocalRegenerate = useCallback((index: number) => {
    const msg = messages[index];
    if (msg) {
      setVersionMap((prev) => ({
        ...prev,
        [msg.id || index]: (prev[msg.id || index] || 0) + 1,
      }));
    }
    onRegenerate(index);
  }, [messages, onRegenerate]);

  const getMessageVersion = useCallback((msg: any, index: number): number => {
    return versionMap[msg.id || index] || 1;
  }, [versionMap]);

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
        {hasMessages && <div className="h-[8px] bg-card w-full shrink-0" />}
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
                createdAt={m.createdAt}
                artifacts={m.artifacts}
                toolInvocations={m.toolInvocations}
                reasoning={m.reasoning}
                parts={m.parts}
                contentBeforeTool={m.contentBeforeTool}
                contentAfterTool={m.contentAfterTool}
                isStreaming={i === lastAssistantIndex}
                messageIndex={i}
                version={getMessageVersion(m, i)}
                prevUserContent={prevUserContent}
                onOpenArtifact={onOpenArtifact}
                onCopy={onCopy}
                onThumbsUp={onThumbsUp}
                onThumbsDown={onThumbsDown}
                onRegenerate={handleLocalRegenerate}
              />
            );
          })}

          {!hasMessages && (
            <div className="w-full mt-4 flex flex-col items-center overflow-visible pb-10">
              <h1 className="text-[38px] font-serif-source mb-[10px] text-foreground text-center">
                Hello, how can I help?
              </h1>
              <ChatInputContainer
                idle={true}
                onSend={onSend}
                isLoading={isLoading}
                onStop={onStop}
                isThinkingEnabled={isThinkingEnabled}
                onToggleThinking={onToggleThinking}
                isWebSearchEnabled={isWebSearchEnabled}
                onToggleWebSearch={onToggleWebSearch}
                onCreateProject={onAddProject}
                onOpenIDE={onOpenIDE}
                currentProjectName={currentProjectName}
                currentModel={currentModel}
                currentMode={currentMode}
                onModeChange={onModeChange}
                isProject={isProject}
              />
            </div>
          )}
        </div>
      </div>

      {bottomSlot && (
        <div className="shrink-0 w-full mx-auto px-4" style={{ maxWidth: 'min(880px, 100%)' }}>
          {bottomSlot}
        </div>
      )}

      {showScrollButton && hasMessages && (
        <div className="shrink-0 flex justify-center w-full mx-auto bg-card relative" style={{ height: 0 }}>
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
        <ChatInputContainer
          idle={false}
          onSend={onSend}
          isLoading={isLoading}
          onStop={onStop}
          isThinkingEnabled={isThinkingEnabled}
          onToggleThinking={onToggleThinking}
          isWebSearchEnabled={isWebSearchEnabled}
          onToggleWebSearch={onToggleWebSearch}
          onCreateProject={onAddProject}
          onOpenIDE={onOpenIDE}
          currentProjectName={currentProjectName}
          currentModel={currentModel}
          currentMode={currentMode}
          onModeChange={onModeChange}
          isProject={isProject}
        />
      )}
    </>
  );
}
