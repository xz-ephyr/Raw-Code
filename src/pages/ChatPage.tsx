import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ChatInput from '../components/chat/ChatInput';
import { UserBubble } from '../components/chat/UserBubble';
import { AssistantBubble } from '../components/chat/AssistantBubble';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { getModelForChatRequest } from '../config/models';
import { chatCompletion, getAIErrorMessage } from '../services/aiService';
import { DatabaseService } from '../services/DatabaseService';
import { useToast } from '../components/ui/Toast';
import { mapUIMessageToLegacyMessage } from '../lib/chatUtils';
import { HugeiconRenderer } from '../components/ui/HugeiconRenderer';
import { ArrowDown02Icon } from '@hugeicons/core-free-icons';

export const ChatPage = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const previousModelRef = useRef<string | null>(null);
  const isThinkingEnabledRef = useRef(false);
  const currentModelRef = useRef<string | null>(null);
  const { addToast } = useToast();

  const toggleThinking = () => setIsThinkingEnabled((prev) => !prev);

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
      if (uuid && uuid !== 'new') {
        DatabaseService.saveMessages(uuid, [message]).catch((e) =>
          console.error('Failed to save assistant message to DB:', e)
        );
      }
    },
    [uuid]
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

  const chat = useChat({
    transport: new DefaultChatTransport({
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
    }),
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
        } else if (uuid === 'new') {
          setMessages([]);
        }
      };
      loadSession();
    }
  }, [uuid, setMessages]);

  useEffect(() => {
    isThinkingEnabledRef.current = isThinkingEnabled;
  }, [isThinkingEnabled]);

  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

  const messages = rawMessages.map(mapUIMessageToLegacyMessage);

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
        const snippet = content.trim().slice(0, 60);
        const title = snippet.length > 0 ? snippet : 'New conversation';
        const session = await ChatSessionManager.create(title);
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
    [uuid, sendMessage, navigate]
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

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white relative">
      {messages.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-10 h-[37px] border-b border-neutral-100 bg-white" />
      )}
      <div className="flex flex-1 min-h-0 pt-[37px]">
        <div className="flex flex-col flex-1 min-w-0 bg-white transition-all duration-300 relative">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className={`flex-1 overflow-y-auto ${messages.length === 0 ? 'flex flex-col items-center justify-start pt-[15vh] p-4' : ''}`}
          >
            {messages.length > 0 && <div className="h-[8px] bg-white w-full shrink-0" />}
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
                  <h1 className="text-[38px] font-serif-source mb-[10px] text-neutral-800 text-center">
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
            <div className="shrink-0 flex justify-center w-full mx-auto bg-white relative" style={{ height: 0 }}>
              <button
                onClick={scrollToBottom}
                className="absolute left-1/2 -translate-x-1/2 bottom-8 flex items-center justify-center w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-black transition-all shadow-sm z-10"
                title="Scroll to bottom"
              >
                <HugeiconRenderer icon={ArrowDown02Icon} size={18} />
              </button>
            </div>
          )}

          {messages.length > 0 && (
            <div className="shrink-0 pb-8 w-full mx-auto px-4 bg-white" style={{ maxWidth: 'min(780px, 100%)' }}>
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
      </div>
    </div>
  );
};
