import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ChatInput from '../components/chat/ChatInput';
import { UserBubble } from '../components/chat/UserBubble';
import { AssistantBubble } from '../components/chat/AssistantBubble';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { getModelForChatRequest } from '../config/models';
import { chatCompletion, getAIErrorMessage, generateSessionTitle } from '../services/aiService';
import { DatabaseService } from '../services/DatabaseService';
import { useToast } from '../components/ui/Toast';
import { mapUIMessageToLegacyMessage } from '../lib/chatUtils';
import { HugeiconRenderer } from '../components/ui/HugeiconRenderer';
import { ArrowDown02Icon } from '@hugeicons/core-free-icons';
import { ArtifactPanel } from '../components/artifact/ArtifactPanel';
import { useArtifacts } from '../hooks/useArtifacts';
import { useSessionTitle } from '../hooks/useSessionTitle';

const MOBILE_BREAKPOINT = 768;
const STORAGE_KEY = 'xz_artifact_panel_width';
const DEFAULT_PANEL_WIDTH = 460;
const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 800;

function getInitialPanelWidth(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const w = parseInt(stored, 10);
      if (!isNaN(w) && w >= MIN_PANEL_WIDTH && w <= MAX_PANEL_WIDTH) return w;
    }
  } catch { /* invalid stored value */ }
  return DEFAULT_PANEL_WIDTH;
}

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

export const ChatPage = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const previousModelRef = useRef<string | null>(null);
  const isThinkingEnabledRef = useRef(false);
  const currentModelRef = useRef<string | null>(null);
  const { addToast } = useToast();
  const { setTitle: setSessionTitle, setSessionId, setUserEdited } = useSessionTitle();
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);

  const toggleThinking = () => setIsThinkingEnabled((prev) => !prev);

  const [panelWidth, setPanelWidth] = useState(getInitialPanelWidth);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const {
    artifacts,
    activeArtifactId,
    isPanelOpen,
    addArtifacts,
    rollbackArtifact,
    selectArtifact,
    closePanel,
  } = useArtifacts();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const SCROLL_THRESHOLD = 150;

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
      const message = mapUIMessageToLegacyMessage(event.message);
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

  // eslint-disable-next-line react-hooks/refs
  const transport = useMemo(() => new DefaultChatTransport({
    fetch: async (_url: any, options: any) => {
      if (!options?.body) {
        throw new Error('Request body is missing');
      }
      const body = JSON.parse(options.body as string);
      const effectiveModel = currentModelRef.current || body.model;
      const result = await chatCompletion({
        messages: body.messages,
        modelName: effectiveModel,
        isThinkingEnabled: isThinkingEnabledRef.current,
        abortSignal: options?.signal,
        previousModelName: previousModelRef.current || undefined,
        sessionId: uuid,
      });

      previousModelRef.current = effectiveModel;

      return (result as any).toUIMessageStreamResponse({
        getErrorMessage: getAIErrorMessage,
      });
    },
    body: {
      model: currentModel,
    },
  }), [uuid, currentModel]);

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
    if (uuid) {
      const loadSession = async () => {
        if (!sessionStorage.getItem('pending-first-message') && uuid !== 'new') {
          const storedMessages = await DatabaseService.getMessages(uuid);
          setMessages(storedMessages.map(mapUIMessageToLegacyMessage));
          const session = await ChatSessionManager.getSession(uuid);
          if (session) {
            setSessionId(uuid);
            setSessionTitle(session.title);
            setUserEdited(false);
          }
        } else if (uuid === 'new') {
          setSessionId('new');
          setSessionTitle('New conversation');
          setUserEdited(false);
          setMessages([]);
        }
      };
      loadSession();
    } else {
      setSessionId(null);
    }
  }, [uuid, setMessages, setSessionId, setSessionTitle, setUserEdited]);

  useEffect(() => {
    isThinkingEnabledRef.current = isThinkingEnabled;
  }, [isThinkingEnabled]);

  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

  const messages = rawMessages.map(mapUIMessageToLegacyMessage);

  useEffect(() => {
    const latestMsg = messages[messages.length - 1];
    if (latestMsg?.artifacts?.length > 0) {
      const autoArtifacts = localStorage.getItem('auto_artifacts') !== 'false';
      if (autoArtifacts) {
        addArtifacts(latestMsg.artifacts);
      }
    }
  }, [messages, addArtifacts]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el && isNearBottomRef.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages]);

  useEffect(() => {
    const handleResetChat = () => {
      setMessages([]);
    };
    window.addEventListener('reset-chat', handleResetChat);
    return () => window.removeEventListener('reset-chat', handleResetChat);
  }, [setMessages]);

  const handleSend = useCallback(
    async (content: string) => {
      if (uuid === 'new') {
        const session = await ChatSessionManager.create('New conversation');
        setSessionId(session.id);
        setUserEdited(false);
        generateSessionTitle(content).then(async (generatedTitle) => {
          if (generatedTitle && generatedTitle !== 'New conversation') {
            await ChatSessionManager.rename(session.id, generatedTitle);
            setSessionTitle(generatedTitle);
          }
        }).catch(() => {});
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
    },
    [uuid, sendMessage, navigate, setSessionId, setSessionTitle, setUserEdited]
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

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = panelWidth;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = startX.current - ev.clientX;
        const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, startWidth.current + delta));
        setPanelWidth(newWidth);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        localStorage.setItem(STORAGE_KEY, String(panelWidth));
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [panelWidth]
  );

  const currentPanelWidth = isMobile ? '100%' : panelWidth;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-[#111110] relative">
      <div className="flex flex-1 min-h-0">
        <div
          className={`flex flex-col min-w-0 bg-white dark:bg-[#111110] transition-all duration-300 relative ${
            isMobile && isPanelOpen
              ? 'hidden'
              : isPanelOpen && !isMobile
                ? 'flex-1'
                : 'flex-1'
          }`}
        >
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className={`flex-1 overflow-y-auto ${messages.length === 0 ? 'flex flex-col items-center justify-start pt-[15vh] p-4' : ''}`}
          >
            {messages.length > 0 && <div className="h-[8px] bg-white dark:bg-[#111110] w-full shrink-0" />}
            <div className="w-full mx-auto px-4 pb-24" style={{ maxWidth: 'min(780px, 100%)' }}>
              {messages.map((m: any, i: number) => (
                <React.Fragment key={m.id || i}>
                  {m.role === 'user' ? (
                    <UserBubble content={m.content} />
                  ) : (
                    <AssistantBubble
                      content={m.content}
                      model={currentModel}
                      isStreaming={
                        isLoading && messages.slice(i + 1).every((msg: any) => msg.role !== 'user')
                      }
                      toolInvocations={m.toolInvocations}
                      reasoning={m.reasoning}
                      onCopy={() => navigator.clipboard.writeText(m.content)}
                      onThumbsUp={() => console.log('Thumbs up')}
                      onThumbsDown={() => console.log('Thumbs down')}
                      onRegenerate={() => {
                        const userMessage = messages[i - 1];
                        if (userMessage) {
                          handleSend(userMessage.content);
                        }
                      }}
                    />
                  )}
                </React.Fragment>
              ))}

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
            <div className="shrink-0 pb-8 w-full mx-auto px-4 bg-white dark:bg-[#111110]" style={{ maxWidth: 'min(780px, 100%)' }}>
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
          <>
            {!isMobile && (
              <div
                className="w-[5px] shrink-0 cursor-col-resize hover:bg-neutral-300 dark:hover:bg-neutral-600 active:bg-neutral-400 dark:active:bg-neutral-500 transition-colors bg-transparent"
                onMouseDown={handleResizeStart}
              />
            )}
            <div
              className="shrink-0 border-l border-neutral-200 dark:border-neutral-700 overflow-hidden"
              style={{ width: currentPanelWidth }}
            >
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
          </>
        )}
      </div>
    </div>
  );
};
