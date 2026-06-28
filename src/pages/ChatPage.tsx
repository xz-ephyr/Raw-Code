import React, { useEffect, useCallback, useState, useRef, useMemo, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ChatInput from '../components/chat/ChatInput';
import { UserBubble } from '../components/chat/UserBubble';
import { AssistantBubble } from '../components/chat/AssistantBubble';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { getModelForChatRequest } from '../config/models';
import { chatCompletion, getAIErrorMessage, generateSessionTitle } from '../services/aiService';
import type { ProjectContext } from '../services/ai/contextController';
import { FileSystemService } from '../services/FileSystemService';
import { DatabaseService } from '../services/DatabaseService';
import { useToast } from '../components/ui/Toast';
import { mapUIMessageToLegacyMessage } from '../lib/chatUtils';
import { HugeiconRenderer } from '../components/ui/HugeiconRenderer';
import { ArrowDown02Icon } from '@hugeicons/core-free-icons';
import { ArtifactPanel } from '../components/artifact/ArtifactPanel';
import type { Artifact } from '../types/artifact';
import { useArtifacts } from '../hooks/useArtifacts';
import { useSessionTitle } from '../hooks/useSessionTitle';
import TitleBar from '../components/layout/TitleBar';

const MOBILE_BREAKPOINT = 768;

const PANEL_MIN_WIDTH = 320;
const PANEL_MAX_WIDTH = 960;
const CHAT_MIN_WIDTH = 320;
const DEFAULT_PANEL_WIDTH = 480;
const PANEL_STORAGE_KEY = 'artifact-panel-width';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

const ChatMessageRow = memo(function ChatMessageRow({
  role,
  content,
  artifacts,
  toolInvocations,
  reasoning,
  parts,
  contentBeforeTool,
  contentAfterTool,
  currentModel,
  isStreaming,
  prevUserContent,
  onOpenArtifact,
  onCopy,
  onThumbsUp,
  onThumbsDown,
  handleSend,
}: {
  role: string;
  content: string;
  artifacts?: any[];
  toolInvocations?: any[];
  reasoning?: string;
  parts?: any[];
  contentBeforeTool?: string;
  contentAfterTool?: string;
  currentModel: string | undefined;
  isStreaming: boolean;
  prevUserContent?: string;
  onOpenArtifact: (artifact: any) => void;
  onCopy: (content: string) => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  handleSend: (content: string) => void;
}) {
  const handleMsgCopy = useCallback(() => onCopy(content), [content, onCopy]);
  const handleThumbsUp = useCallback(() => onThumbsUp(), [onThumbsUp]);
  const handleThumbsDown = useCallback(() => onThumbsDown(), [onThumbsDown]);
  const handleMsgRegenerate = useCallback(() => {
    if (prevUserContent) {
      handleSend(prevUserContent);
    }
  }, [prevUserContent, handleSend]);

  const handleOpenMsgArtifact = useCallback(() => {
    if (artifacts && artifacts.length > 0) {
      onOpenArtifact(artifacts[0]);
    }
  }, [artifacts, onOpenArtifact]);

  return (
    <React.Fragment>
      {role === 'user' ? (
        <UserBubble content={content} />
      ) : (
        <AssistantBubble
          content={content}
          model={currentModel}
          isStreaming={isStreaming}
          toolInvocations={toolInvocations}
          reasoning={reasoning}
          parts={parts}
          artifacts={artifacts}
          contentBeforeTool={contentBeforeTool}
          contentAfterTool={contentAfterTool}
          onOpenArtifact={
            artifacts && artifacts.length > 0 ? handleOpenMsgArtifact : undefined
          }
          onCopy={handleMsgCopy}
          onThumbsUp={handleThumbsUp}
          onThumbsDown={handleThumbsDown}
          onRegenerate={handleMsgRegenerate}
        />
      )}
    </React.Fragment>
  );
});

export const ChatPage = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(PANEL_STORAGE_KEY);
      if (saved) {
        return Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, parseInt(saved, 10)));
      }
    } catch { /* ignore */ }
    return DEFAULT_PANEL_WIDTH;
  });
  const previousModelRef = useRef<string | null>(null);
  const isThinkingEnabledRef = useRef(false);
  const currentModelRef = useRef<string | null>(null);
  const { addToast } = useToast();
  const { setTitle: setSessionTitle, setSessionId, setIsTitleGenerating } = useSessionTitle();
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);

  const toggleThinking = () => setIsThinkingEnabled((prev) => !prev);

  const {
    artifacts,
    activeArtifactId,
    isPanelOpen,
    addArtifacts,
    rollbackArtifact,
    selectArtifact,
    closePanel,
    openPanel,
    clearArtifacts,
  } = useArtifacts();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const SCROLL_THRESHOLD = 150;

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  const handleThumbsUp = useCallback(() => {
    console.log('Thumbs up');
  }, []);

  const handleThumbsDown = useCallback(() => {
    console.log('Thumbs down');
  }, []);

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

  const handleChatFinish = useCallback(
    async (event: any) => {
      if (!event?.message) {
        console.warn('handleChatFinish: event.message is missing', event);
        return;
      }
      let message: any;
      try {
        message = mapUIMessageToLegacyMessage(event.message);
      } catch (e) {
        console.error('handleChatFinish: mapUIMessageToLegacyMessage failed', e);
        return;
      }
      if (message.artifacts?.length > 0) {
        const autoArtifacts = localStorage.getItem('auto_artifacts') !== 'false';
        if (autoArtifacts) {
          addArtifacts(message.artifacts);
        }
      }
      if (uuid && uuid !== 'new') {
        const msgToSave = { ...message };
        delete msgToSave.artifacts;
        DatabaseService.saveMessages(uuid, [msgToSave]).catch((e) =>
          console.error('Failed to save assistant message to DB:', e)
        );
      }
    },
    [uuid, addArtifacts]
  );

  const [modelRevision, setModelRevision] = useState(0);

  useEffect(() => {
    const handler = () => setModelRevision((v) => v + 1);
    window.addEventListener('model-changed', handler);
    return () => window.removeEventListener('model-changed', handler);
  }, []);

  const currentModel = useMemo(() => {
    void modelRevision;
    return getModelForChatRequest(uuid);
  }, [uuid, modelRevision]);

  const getProjectContext = useCallback(async (): Promise<ProjectContext | undefined> => {
    if (!uuid || uuid === 'new') return undefined;
    try {
      const session = await ChatSessionManager.getSession(uuid);
      if (!session?.projectId) return undefined;
      const projects = await DatabaseService.getProjects();
      const project = projects.find(p => p.id === session.projectId);
      if (!project) return undefined;
      const entries = await FileSystemService.getTree(project.path, 3);
      const flatten = (items: typeof entries, indent = ''): string =>
        items.map(e =>
          `${indent}${e.isDirectory ? '📁' : '📄'} ${e.name}` +
          (e.children ? '\n' + flatten(e.children, indent + '  ') : '')
        ).join('\n');
      return { name: project.name, path: project.path, files: flatten(entries) };
    } catch {
      return undefined;
    }
  }, [uuid]);

  // eslint-disable-next-line react-hooks/refs
  const transport = useMemo(() => new DefaultChatTransport({
    fetch: async (_url: any, options: any) => {
      if (!options?.body) {
        throw new Error('Request body is missing');
      }
      const body = JSON.parse(options.body as string);
      const effectiveModel = currentModelRef.current || body.model;
      const projectContext = uuid && uuid !== 'new' ? await getProjectContext() : undefined;
      const result = await chatCompletion({
        messages: body.messages,
        modelName: effectiveModel,
        isThinkingEnabled: isThinkingEnabledRef.current,
        abortSignal: options?.signal,
        previousModelName: previousModelRef.current || undefined,
        sessionId: uuid,
        projectContext,
      });

      previousModelRef.current = effectiveModel;

      return (result as any).toUIMessageStreamResponse({
        getErrorMessage: getAIErrorMessage,
      });
    },
    body: {
      model: currentModel,
    },
  }), [uuid, currentModel, getProjectContext]);

  const chat = useChat({
    transport,
    messages: [],
    onError: (chatError: Error) => {
      const msg = getAIErrorMessage(chatError);
      console.error('Chat stream failed:', msg);
      addToast(msg, 'error');
    },
    onFinish: handleChatFinish,
  }) as unknown as {
    messages: any[];
    sendMessage: (msg: any) => void;
    status: string;
    stop: () => void;
    setMessages: (msgs: any[] | ((msgs: any[]) => any[])) => void;
  };

  const {
    messages: rawMessages,
    sendMessage,
    status,
    stop,
    setMessages,
  } = chat;

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (isLoading) {
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.userSelect = '';
    };
  }, [isLoading]);

  useEffect(() => {
    clearArtifacts();
    if (uuid) {
      const loadSession = async () => {
        if (!sessionStorage.getItem('pending-first-message') && uuid !== 'new') {
          const storedMessages = await DatabaseService.getMessages(uuid);
          setMessages(storedMessages.map(mapUIMessageToLegacyMessage));
          const session = await ChatSessionManager.getSession(uuid);
          if (session) {
            setSessionId(uuid);
            setSessionTitle(session.title);
          }
        } else if (uuid === 'new') {
          setSessionId('new');
          setSessionTitle('New conversation');
          setMessages([]);
        }
      };
      loadSession();
    } else {
      setSessionId(null);
    }
  }, [uuid, setMessages, setSessionId, setSessionTitle, clearArtifacts]);

  useEffect(() => {
    isThinkingEnabledRef.current = isThinkingEnabled;
  }, [isThinkingEnabled]);

  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

  const messages = useMemo(
    () => rawMessages.map(mapUIMessageToLegacyMessage),
    [rawMessages]
  );

  const lastAssistantIndex = useMemo(() => {
    if (!isLoading) return -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role !== 'user') return i;
    }
    return -1;
  }, [messages, isLoading]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollToBottom = () => {
      if (isNearBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    };

    scrollToBottom();

    const observer = new ResizeObserver(scrollToBottom);
    observer.observe(el);

    return () => observer.disconnect();
  }, [messages.length]);

  useEffect(() => {
    const handleResetChat = () => {
      setMessages([]);
    };
    window.addEventListener('reset-chat', handleResetChat);
    return () => window.removeEventListener('reset-chat', handleResetChat);
  }, [setMessages]);

  const titleGeneratedRef = useRef(false);

  const handleSend = useCallback(
    async (content: string) => {
      if (uuid === 'new') {
        const session = await ChatSessionManager.create('New conversation');
        setSessionId(session.id);
        sessionStorage.setItem('pending-first-message', content);
        navigate(`/thread/${session.id}`);
        return;
      }

      const userMsg = {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content,
        createdAt: Date.now(),
      };

      if (uuid) {
        DatabaseService.saveMessages(uuid, [userMsg]).catch((e) =>
          console.error('Failed to save user message to DB:', e)
        );
      }

      sendMessage({ text: content });

      // Generate AI title if still placeholder and not already generating
      if (!titleGeneratedRef.current && uuid && uuid !== 'new') {
        const session = await ChatSessionManager.getSession(uuid).catch(() => null);
        const sessionTitle = session?.title || '';
        if (sessionTitle === 'New conversation' || sessionTitle === '') {
          setIsTitleGenerating(true);
          generateSessionTitle(content).then(async (generatedTitle) => {
            if (generatedTitle && generatedTitle !== 'New conversation') {
              await ChatSessionManager.rename(uuid, generatedTitle);
              setSessionTitle(generatedTitle);
            }
            setIsTitleGenerating(false);
            titleGeneratedRef.current = true;
          }).catch(() => {
            setIsTitleGenerating(false);
            titleGeneratedRef.current = true;
          });
        } else {
          setSessionTitle(sessionTitle);
          titleGeneratedRef.current = true;
        }
      }
    },
    [uuid, sendMessage, navigate, setSessionId, setSessionTitle, setIsTitleGenerating]
  );

  useEffect(() => {
    if (uuid && uuid !== 'new') {
      const pendingMessage = sessionStorage.getItem('pending-first-message');
      if (pendingMessage) {
        sessionStorage.removeItem('pending-first-message');
        handleSend(pendingMessage);
      }
    }
  }, [uuid, handleSend]);

  const scrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  const handleOpenArtifact = useCallback(
    (artifact: Artifact) => {
      addArtifacts([artifact]);
      selectArtifact(artifact.identifier);
      openPanel();
    },
    [addArtifacts, selectArtifact, openPanel]
  );

  const isResizing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (clientX: number) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - clientX;
      const clamped = Math.max(
        PANEL_MIN_WIDTH,
        Math.min(
          PANEL_MAX_WIDTH,
          window.innerWidth - CHAT_MIN_WIDTH,
          newWidth
        )
      );
      setPanelWidth(clamped);
    };

    const onUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      setPanelWidth((prev) => {
        localStorage.setItem(PANEL_STORAGE_KEY, String(prev));
        return prev;
      });
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX);
    const onMouseUp = () => onUp();
    const onTouchMove = (e: TouchEvent) => onMove(e.touches[0].clientX);
    const onTouchEnd = () => onUp();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startResize();
  }, [startResize]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    startResize();
  }, [startResize]);

  const handleDividerKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 50 : 20;
    let newWidth = panelWidth;
    let handled = true;

    switch (e.key) {
      case 'ArrowLeft':
        newWidth = Math.max(PANEL_MIN_WIDTH, panelWidth - step);
        break;
      case 'ArrowRight':
        newWidth = Math.min(PANEL_MAX_WIDTH, panelWidth + step);
        break;
      case 'Home':
        newWidth = PANEL_MIN_WIDTH;
        break;
      case 'End':
        newWidth = PANEL_MAX_WIDTH;
        break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      setPanelWidth(newWidth);
      localStorage.setItem(PANEL_STORAGE_KEY, String(newWidth));
    }
  }, [panelWidth]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-[#111110] relative">
      {uuid !== 'new' && messages.length > 0 && <TitleBar />}
      <div className="flex flex-1 min-h-0">
        <div
          className={`flex flex-col min-w-0 bg-white dark:bg-[#111110] relative ${
            isMobile && isPanelOpen
              ? 'hidden'
              : 'flex-1'
          }`}
        >
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className={`flex-1 overflow-y-auto thin-scrollbar ${messages.length === 0 ? 'flex flex-col items-center justify-start pt-[15vh] p-4' : ''}`}
          >
            {messages.length > 0 && <div className="h-[8px] bg-white dark:bg-[#111110] w-full shrink-0" />}
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
                    onOpenArtifact={handleOpenArtifact}
                    onCopy={handleCopyMessage}
                    onThumbsUp={handleThumbsUp}
                    onThumbsDown={handleThumbsDown}
                    handleSend={handleSend}
                  />
                );
              })}

              {messages.length === 0 && (
                <div className="w-full mt-4 flex flex-col items-center overflow-visible pb-10">
                  <h1 className="text-[38px] font-serif-source mb-[10px] text-neutral-800 dark:text-neutral-200 text-center">
                    Hello, how can I help?
                  </h1>
                  <ChatInput
                    onSend={handleSend}
                    isLoading={isLoading}
                    onStop={stop}
                    isIdle={true}
                    isThinkingEnabled={isThinkingEnabled}
                    onToggleThinking={toggleThinking}
                  />
                </div>
              )}
            </div>
          </div>

          {showScrollButton && (
            <div className="shrink-0 flex justify-center w-full mx-auto bg-white dark:bg-[#111110] relative" style={{ height: 0 }}>
              <button
                onClick={scrollToBottom}
                className="absolute left-1/2 -translate-x-1/2 bottom-8 flex items-center justify-center w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-black dark:text-white transition-all shadow-sm z-10"
                title="Scroll to bottom"
              >
                <HugeiconRenderer icon={ArrowDown02Icon} size={18} />
              </button>
            </div>
          )}

          {messages.length > 0 && (
            <div className="shrink-0 pb-8 w-full mx-auto px-4 bg-white dark:bg-[#111110]" style={{ maxWidth: 'min(880px, 100%)' }}>
              <ChatInput
                onSend={handleSend}
                isLoading={isLoading}
                onStop={stop}
                isThinkingEnabled={isThinkingEnabled}
                onToggleThinking={toggleThinking}
              />
            </div>
          )}
        </div>

        {isPanelOpen && artifacts.length > 0 && (
          <div
            ref={panelRef}
            className="flex overflow-hidden min-w-0"
            style={{ width: panelWidth, flex: 'none' }}
          >
            <div
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onKeyDown={handleDividerKeyDown}
              tabIndex={0}
              role="separator"
              aria-orientation="vertical"
              aria-valuenow={panelWidth}
              aria-valuemin={PANEL_MIN_WIDTH}
              aria-valuemax={PANEL_MAX_WIDTH}
              className="w-[5px] shrink-0 cursor-col-resize bg-transparent relative flex items-center justify-center group/divider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset"
            >
              <div className="w-px h-full bg-neutral-200 dark:bg-neutral-700 group-hover/divider:bg-neutral-400 dark:group-hover/divider:bg-neutral-500 group-active/divider:bg-neutral-500 dark:group-active/divider:bg-neutral-400 transition-colors" />
            </div>
            {isMobile && (
              <div className="absolute inset-0 z-50 bg-black/30" onClick={closePanel} />
            )}
            <ArtifactPanel
              artifacts={artifacts}
              activeArtifactId={activeArtifactId}
              onSelectArtifact={selectArtifact}
              onClose={closePanel}
              onRegenerate={(prompt) => {
                const chatInput = document.querySelector('textarea');
                if (chatInput) {
                  chatInput.value = prompt;
                  chatInput.focus();
                }
              }}
              onRollback={rollbackArtifact}
            />
          </div>
        )}
      </div>
    </div>
  );
};
