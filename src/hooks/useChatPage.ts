import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { UIMessage } from '../lib/chatUtils';
import { ChatSessionManager } from '@/services/ChatSessionManager';
import { ChatStreamService, setActiveSessionId } from '@/services/ChatStreamService';
import { getModelForChatRequest } from '@core/config/models';
import { getAIErrorMessage, generateSessionTitle } from '@core/models/aiService';
import { DatabaseService } from '@core/utils/DatabaseService';
import { useToast } from '../components/ui/Toast';
import { useProjectStore } from '@/stores/projectStore';
import { hydrateStoredMessage, mapUIMessageToLegacyMessage } from '../lib/chatUtils';
import { useFilePanel } from '../hooks/useFilePanel';
import { useAgentWorkspace } from '../hooks/useAgentWorkspace';
import { useSessionTitle } from '../hooks/useSessionTitle';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { usePendingConfirm } from '../hooks/usePendingConfirm';
import type { FileItem } from '../types/file-panel';

const MOBILE_BREAKPOINT = 768;

async function fetchConnectedConnectors(): Promise<string[]> {
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await fetch(`${baseUrl}/connectors/status`, { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json() as Record<string, { connected: boolean }>;
    return Object.entries(data).filter(([, s]) => s.connected).map(([p]) => p);
  } catch {
    return [];
  }
}

export function useChatPage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const isThinkingEnabled = useProjectStore(s => s.isThinkingEnabled);
  const setIsThinkingEnabled = useProjectStore(s => s.setIsThinkingEnabled);
  const isWebSearchEnabled = useProjectStore(s => s.isWebSearchEnabled);
  const setIsWebSearchEnabled = useProjectStore(s => s.setIsWebSearchEnabled);
  const currentMode = useProjectStore(s => s.currentMode);
  const setCurrentMode = useProjectStore(s => s.setCurrentMode);

  const { addToast } = useToast();
  const {
    pendingConfirm,
    pendingQuestion,
    setPendingQuestion,
    handleQuestionAnswer,
    handleConfirmApprove,
    handleConfirmDeny,
  } = usePendingConfirm();
  const { setTitle: setSessionTitle, setSessionId, setIsTitleGenerating } = useSessionTitle();
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);
  const {
    panelWidth,
    startResize,
    handleTouchStart,
    handleDividerKeyDown,
    PANEL_MIN_WIDTH,
    PANEL_MAX_WIDTH,
  } = useResizablePanel();

  const {
    panelWidth: agentPanelWidth,
    startResize: startAgentResize,
    handleTouchStart: handleAgentTouchStart,
    handleDividerKeyDown: handleAgentDividerKeyDown,
    PANEL_MIN_WIDTH: AGENT_PANEL_MIN_WIDTH,
    PANEL_MAX_WIDTH: AGENT_PANEL_MAX_WIDTH,
  } = useResizablePanel('agent-panel-width', { minWidth: 300, maxWidth: 600 });

  const toggleThinking = () => {
    const next = !isThinkingEnabled;
    if (next) setIsWebSearchEnabled(false);
    setIsThinkingEnabled(next);
  };
  const toggleWebSearch = () => {
    const next = !isWebSearchEnabled;
    if (next) setIsThinkingEnabled(false);
    setIsWebSearchEnabled(next);
  };
  const handleModeChange = useCallback((modeId: string | undefined) => {
    setCurrentMode(modeId);
    currentModeRef.current = modeId;
  }, [setCurrentMode]);

const {
    files,
    activeFileId,
    isPanelOpen,
    addFiles,
    selectFile,
    closePanel,
    openPanel,
  } = useFilePanel();

  const {
    agents: agentAgents,
    activeAgent,
    isPanelOpen: isAgentPanelOpen,
    selectAgent,
    closePanel: closeAgentPanel,
    openPanel: openAgentPanel,
  } = useAgentWorkspace();

  const handleNewThread = useCallback(async () => {
    if (!uuid || uuid === 'new') return;
    try {
      const newSession = await ChatSessionManager.create('New conversation');
      navigate(`/thread/${newSession.id}`);
    } catch (e) { console.error('Failed to create new thread:', e); }
  }, [uuid, navigate]);

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content).catch((e) =>
      console.error('Failed to copy:', e)
    );
  }, []);

  const [completionDurations, setCompletionDurations] = useState<Record<string, number>>({});

  const modelRevision = useProjectStore(s => s.modelRevision);
  const incrementModelRevision = useProjectStore(s => s.incrementModelRevision);

  useEffect(() => {
    const handler = () => incrementModelRevision();
    window.addEventListener('model-changed', handler);
    return () => window.removeEventListener('model-changed', handler);
  }, [incrementModelRevision]);

  const currentModel = useMemo(() => {
    return getModelForChatRequest(uuid);
  }, [uuid, modelRevision]);

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [status, setStatus] = useState<'idle' | 'streaming' | 'submitted' | 'error'>('idle');
  const [sessionUsage, setSessionUsage] = useState<{ inputTokens: number; outputTokens: number; reasoningTokens?: number; cachedInputTokens?: number } | undefined>();
  const [streamError, setStreamError] = useState<string | undefined>();
  const currentModeRef = useRef<string | undefined>(undefined);
  const isThinkingEnabledRef = useRef(false);
  const isWebSearchEnabledRef = useRef(false);
  const lastUuidRef = useRef<string | undefined>(undefined);
  const firstUserMessageRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    isThinkingEnabledRef.current = isThinkingEnabled;
  }, [isThinkingEnabled]);

  useEffect(() => {
    isWebSearchEnabledRef.current = isWebSearchEnabled;
  }, [isWebSearchEnabled]);

  useEffect(() => {
    if (!uuid || uuid === 'new') {
      setMessages([]);
      setStatus('idle');
      return;
    }
    setActiveSessionId(uuid);
    return () => {
      setActiveSessionId(null);
      setStatus('idle');
    };
  }, [uuid]);

  useEffect(() => {
    const prev = document.body.style.userSelect;
    if (status === 'submitted' || status === 'streaming') {
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.body.style.userSelect = prev;
    };
  }, [status]);

  useEffect(() => {
    if (!uuid || uuid === 'new') return;

    const loadSession = async () => {
      const session = await ChatSessionManager.getSession(uuid).catch(() => null);
      if (!session) return;

      const storedMessages = await DatabaseService.getMessages(uuid);
      const mapped = storedMessages.map(hydrateStoredMessage).filter(Boolean) as UIMessage[];
      setMessages(mapped);

      const allFiles = mapped.flatMap((m: any) => m.files || []);
      if (allFiles.length > 0) {
        addFiles(allFiles);
      }

setSessionId(uuid);
      setSessionTitle(session.title);

      // Clear unread when opening the thread
      ChatSessionManager.markAsRead(uuid);

      const streamStatus = ChatStreamService.getStatus(uuid);
    if (streamStatus === 'streaming') {
      setStatus('streaming');
      const unsubscribe = ChatStreamService.subscribe(uuid, (msg, isPartial) => {
        const legacyMsg = mapUIMessageToLegacyMessage(msg) || msg;
        setMessages(prev => {
          const exists = prev.findIndex(m => m.id === legacyMsg.id);
          if (exists >= 0) {
            const updated = [...prev];
            updated[exists] = legacyMsg;
            return updated;
          }
          return [...prev, legacyMsg];
        });
        if (!isPartial) {
          setStatus('idle');
        }
      });
      return () => unsubscribe();
    }

    };
    loadSession();
  }, [uuid, addFiles, setMessages, setSessionId, setSessionTitle]);

  const handleSend = useCallback(async (content: string) => {
    if (uuid === 'new') {
      const session = await ChatSessionManager.create('New conversation');
      setSessionId(session.id);
      sessionStorage.setItem('pending-first-message', content);
      navigate(`/thread/${session.id}`);
      return;
    }

    const userMsg: UIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: Date.now(),
      parts: [{ type: 'text', text: content }],
    };

    if (uuid) {
      DatabaseService.saveMessages(uuid, [userMsg]).catch((e) =>
        console.error('Failed to save user message to DB:', e)
      );
    }

    const placeholderId = crypto.randomUUID();
    const placeholderMsg: UIMessage = {
      id: placeholderId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      parts: [],
    };

    setMessages(prev => [...prev, userMsg, placeholderMsg]);
    const updatedMessages = [...messagesRef.current, userMsg];

    if (lastUuidRef.current !== uuid) {
      titleGeneratedRef.current = false;
      lastUuidRef.current = uuid;
    }

    if (uuid && uuid !== 'new' && !titleGeneratedRef.current) {
      firstUserMessageRef.current = content;
    }

    setStatus('submitted');

    const connectedConnectors = await fetchConnectedConnectors();

    ChatStreamService.start({
      sessionId: uuid!,
      messages: updatedMessages,
      modelName: currentModel,
      modeId: currentMode,
      projectContext: undefined,
      connectedConnectors,
      isWebSearchEnabled: isWebSearchEnabledRef.current,
    }, {
      onMessage: (msg, isPartial) => {
        const legacyMsg = mapUIMessageToLegacyMessage(msg) || msg;
        setMessages(prev => {
          const exists = prev.findIndex(m => m.id === legacyMsg.id);
          if (exists >= 0) {
            const updated = [...prev];
            updated[exists] = legacyMsg;
            return updated;
          }
          const placeholderIdx = prev.findIndex(m => m.role === 'assistant' && !m.content);
          if (placeholderIdx >= 0) {
            const updated = [...prev];
            updated[placeholderIdx] = legacyMsg;
            return updated;
          }
          return [...prev, legacyMsg];
        });
        if (!isPartial) {
          setStatus('idle');
        } else {
          setStatus('streaming');
        }
      },
      onUsageUpdate: (usage) => setSessionUsage(usage),
      onFinish: (msg) => {
        setStatus('idle');
        const legacyMsg = mapUIMessageToLegacyMessage(msg) || msg;
        const duration = Date.now() - (legacyMsg.createdAt || Date.now());
        if (legacyMsg.id) {
          setCompletionDurations(prev => ({ ...prev, [legacyMsg.id as string]: duration }));
        }
        if (uuid && uuid !== 'new' && !titleGeneratedRef.current && firstUserMessageRef.current) {
          maybeGenerateTitle(uuid, firstUserMessageRef.current, legacyMsg.content);
          firstUserMessageRef.current = undefined;
        }
        if (legacyMsg.files && legacyMsg.files.length > 0) {
          const autoFiles = localStorage.getItem('auto_files') !== 'false';
          if (autoFiles) {
            addFiles(legacyMsg.files);
          }
        }
        if (uuid && uuid !== 'new') {
          const savedModel = currentModelRef.current || currentModel;
          DatabaseService.saveMessages(uuid, [{ ...legacyMsg, model: savedModel }]).catch((e) =>
            console.error('Failed to save assistant message to DB:', e)
          );
        }
      },
      onError: (err) => {
        const msg = getAIErrorMessage(err);
        console.error('Chat stream failed:', msg);
        addToast(msg, 'error');
        setStreamError(msg);
        setStatus('error');
      },
    });
  }, [uuid, navigate, setSessionId, setSessionTitle, addFiles, currentModel, currentMode]);

  const stop = useCallback(() => {
    if (uuid) {
      ChatStreamService.stop(uuid);
      setStatus('idle');
    }
  }, [uuid]);

  useEffect(() => {
    if (uuid && uuid !== 'new') {
      const pendingMessage = sessionStorage.getItem('pending-first-message');
      if (pendingMessage) {
        sessionStorage.removeItem('pending-first-message');
        handleSend(pendingMessage);
      }
    }
  }, [uuid, handleSend]);

  useEffect(() => {
    const handleResetChat = () => {
      setMessages([]);
    };
    window.addEventListener('reset-chat', handleResetChat);
    return () => window.removeEventListener('reset-chat', handleResetChat);
  }, [setMessages]);

  useEffect(() => {
    const handleStreamCancelled = (e: Event) => {
      const { sessionId } = (e as CustomEvent).detail || {};
      if (sessionId && sessionId === uuid) {
        setMessages(prev => prev.filter(m => !(m.role === 'assistant' && !m.content)));
      }
    };
    window.addEventListener('stream-cancelled', handleStreamCancelled);
    return () => window.removeEventListener('stream-cancelled', handleStreamCancelled);
  }, [uuid]);

  const titleGeneratedRef = useRef(false);
  const titleGeneratingRef = useRef(false);

  const maybeGenerateTitle = async (
    sessionUuid: string,
    content: string,
    responseContent?: string,
  ) => {
    if (titleGeneratingRef.current || titleGeneratedRef.current) return;

    const session = await ChatSessionManager.getSession(sessionUuid).catch(() => null);
    if (session && session.title && session.title !== 'New conversation') {
      titleGeneratedRef.current = true;
      return;
    }

    titleGeneratingRef.current = true;
    setIsTitleGenerating(true);
    try {
      const generatedTitle = await generateSessionTitle(content, responseContent);
      if (generatedTitle) {
        await ChatSessionManager.rename(sessionUuid, generatedTitle);
        window.dispatchEvent(new CustomEvent('session-title-changed'));
        setSessionTitle(generatedTitle);
        titleGeneratedRef.current = true;
      }
    } catch (e) { console.error('Failed to generate title:', e); }
    setIsTitleGenerating(false);
    titleGeneratingRef.current = false;
  };

  const handleOpenFile = useCallback(
    (file: FileItem) => {
      const existing = files.find(f => f.identifier === file.identifier);
      if (existing && (file.version ?? 0) <= existing.version) return;
      addFiles([file]);
      selectFile(file.identifier);
      openPanel();
    },
    [addFiles, selectFile, openPanel, files]
  );

  const panelRef = useRef<HTMLDivElement>(null);

  const isLoading = status === 'submitted' || status === 'streaming';
  const lastAssistantIndex = useMemo(() => {
    if (!isLoading) return -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role !== 'user') return i;
    }
    return -1;
  }, [messages, isLoading]);

  const currentModelRef = useRef<string | null>(null);
  currentModelRef.current = currentModel;

  return {
    uuid,
    isMobile,
    panelWidth,
    panelRef,
    startResize,
    handleTouchStart,
    handleDividerKeyDown,
    PANEL_MIN_WIDTH,
    PANEL_MAX_WIDTH,
    isThinkingEnabled,
    isWebSearchEnabled,
    currentModel,
    currentMode,
    toggleThinking,
    toggleWebSearch,
    handleModeChange,
    files,
    activeFileId,
    isPanelOpen,
    closePanel,
    messages,
    isLoading,
    lastAssistantIndex,
    completionDurations,
    handleNewThread,
    handleCopyMessage,
    handleSend,
    stop,
    handleOpenFile,
    pendingConfirm,
    pendingQuestion,
    setPendingQuestion,
    handleQuestionAnswer,
    handleConfirmApprove,
    handleConfirmDeny,
    streamError,
    sessionUsage,
    agentAgents,
    activeAgent,
    isAgentPanelOpen,
    selectAgent,
    closeAgentPanel,
    openAgentPanel,
    agentPanelWidth,
    startAgentResize,
    handleAgentTouchStart,
    handleAgentDividerKeyDown,
    AGENT_PANEL_MIN_WIDTH,
    AGENT_PANEL_MAX_WIDTH,
  };
}