import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { ChatSessionManager } from '@/services/ChatSessionManager';
import { getModelForChatRequest, initUsedModelsCache } from '@core/config/models';
import { chatCompletion, getAIErrorMessage, generateSessionTitle } from '@core/models/aiService';
import { approveToolConfirmation, denyToolConfirmation } from '@core/utils/toolConfirm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { ProjectContext } from '@core/memory/contextController';
import { FileSystemService } from '@core/workspace/FileSystemService';
import { DatabaseService } from '@core/utils/DatabaseService';
import { useToast } from '../components/ui/Toast';
import { useProjectStore } from '@/stores/projectStore';
import { useTerminal } from '@/contexts/TerminalContext';
import { mapUIMessageToLegacyMessage } from '../lib/chatUtils';
import { ArtifactPanel } from '../components/artifact/ArtifactPanel';
import type { Artifact } from '../types/artifact';
import { useArtifacts } from '../hooks/useArtifacts';
import IDEShell from '../ide/IDEShell';
import { useSessionTitle } from '../hooks/useSessionTitle';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { PageGradient } from '../components/ui/PageGradient';
import { MessageList } from '../components/chat/MessageList';
import TitleBar from '../components/layout/TitleBar';
import { isTauri } from '../lib/tauri';
import type { Project } from '../types/chat';
import type { ProjectFileEntry } from '../ide/types';

const MOBILE_BREAKPOINT = 768;

export const ChatPage = () => {
  const { uuid, folder } = useParams();
  const navigate = useNavigate();
  const isThinkingEnabled = useProjectStore(s => s.isThinkingEnabled);
  const setIsThinkingEnabled = useProjectStore(s => s.setIsThinkingEnabled);
  const isWebSearchEnabled = useProjectStore(s => s.isWebSearchEnabled);
  const setIsWebSearchEnabled = useProjectStore(s => s.setIsWebSearchEnabled);
  const currentMode = useProjectStore(s => s.currentMode);
  const setCurrentMode = useProjectStore(s => s.setCurrentMode);
  const setProjectContext = useProjectStore(s => s.setProjectContext);
  const currentProjectId = useProjectStore(s => s.currentProjectId);
  const setCurrentProjectId = useProjectStore(s => s.setCurrentProjectId);
  const previousModelRef = useRef<string | null>(null);
  const isThinkingEnabledRef = useRef(false);
  const isWebSearchEnabledRef = useRef(true);
  const currentModelRef = useRef<string | null>(null);
  const currentModeRef = useRef<string | undefined>('plan');
  const projectIdRef = useRef<string | null>(null);
  const projectContextCacheRef = useRef<Record<string, { context: ProjectContext; timestamp: number }>>({});
  const { addToast } = useToast();
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
    panelWidth: idePanelWidth,
    startResize: startIDEResize,
    handleTouchStart: handleIDETouchStart,
    handleDividerKeyDown: handleIDEDividerKeyDown,
    PANEL_MIN_WIDTH: IDE_PANEL_MIN_WIDTH,
    PANEL_MAX_WIDTH: IDE_PANEL_MAX_WIDTH,
  } = useResizablePanel('ide-panel-width', { maxWidth: 9999 });

  const isProject = !!folder;
  const currentProjectName = useMemo(() => {
    if (!folder) return undefined;
    return folder.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }, [folder]);

  const toggleThinking = () => setIsThinkingEnabled(!isThinkingEnabled);
  const toggleWebSearch = () => setIsWebSearchEnabled(!isWebSearchEnabled);
  const handleModeChange = useCallback((modeId: string | undefined) => {
    setCurrentMode(modeId);
    currentModeRef.current = modeId;
  }, [setCurrentMode]);

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

  const [isIDEPanelOpen, setIsIDEPanelOpen] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFileEntry[]>([]);
  const openIDEPanel = useCallback(() => setIsIDEPanelOpen(true), []);
  const closeIDEPanel = useCallback(() => setIsIDEPanelOpen(false), []);
  const { visible: terminalVisible, toggle: toggleTerminal } = useTerminal();

  const handleNewThread = useCallback(async () => {
    if (!uuid || uuid === 'new') return;
    try {
      const session = await ChatSessionManager.getSession(uuid);
      if (!session?.projectId) return;
      const newSession = await ChatSessionManager.create('New conversation', undefined, session.projectId);
      const slug = folder || newSession.id;
      navigate(`/project/${slug}/${newSession.id}`);
    } catch { /* ignore */ }
  }, [uuid, folder, navigate]);

  useEffect(() => {
    if (!isIDEPanelOpen || !uuid || uuid === 'new') return;
    const loadProjectFiles = async () => {
      try {
        const session = await ChatSessionManager.getSession(uuid);
        if (!session?.projectId) return;
        const projects = await DatabaseService.getProjects();
        const project = projects.find(p => p.id === session.projectId);
        if (!project) return;
        const pc = await FileSystemService.getProjectContent(project.path, project.id);
        const entries: ProjectFileEntry[] = pc.contents.map(c => ({
          path: c.path,
          content: c.text,
        }));
        if (entries.length > 0) setProjectFiles(entries);
      } catch { /* ignore */ }
    };
    loadProjectFiles();
  }, [isIDEPanelOpen, uuid]);

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  const handleThumbsUp = useCallback(() => {
    console.log('Thumbs up');
  }, []);

  const handleThumbsDown = useCallback(() => {
    console.log('Thumbs down');
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

  const modelRevision = useProjectStore(s => s.modelRevision);
  const incrementModelRevision = useProjectStore(s => s.incrementModelRevision);

  useEffect(() => {
    const handler = () => incrementModelRevision();
    window.addEventListener('model-changed', handler);
    return () => window.removeEventListener('model-changed', handler);
  }, [incrementModelRevision]);

  const currentModel = useMemo(() => {
    void modelRevision;
    return getModelForChatRequest(uuid, currentProjectId || undefined);
  }, [uuid, modelRevision, currentProjectId]);

  const getProjectContext = useCallback(async (): Promise<ProjectContext | undefined> => {
    if (!uuid || uuid === 'new') return undefined;

    try {
      const session = await ChatSessionManager.getSession(uuid);
      if (!session?.projectId) return undefined;

      const now = Date.now();
      const MAX_CACHE_ENTRIES = 5;
      const CACHE_TTL = 30000; // 30 second staleness window

      // 1. Prune expired entries and manage size
      const entries = Object.entries(projectContextCacheRef.current);
      if (entries.length >= MAX_CACHE_ENTRIES || entries.some(([, v]) => now - v.timestamp > CACHE_TTL)) {
        const sorted = entries
          .filter(([, v]) => now - v.timestamp <= CACHE_TTL)
          .sort((a, b) => (b[1] as any).timestamp - (a[1] as any).timestamp);

        projectContextCacheRef.current = Object.fromEntries(sorted.slice(0, MAX_CACHE_ENTRIES - 1));
      }

      // 2. Check cache
      const cached = projectContextCacheRef.current[session.projectId];
      if (cached && now - cached.timestamp < CACHE_TTL) {
        return cached.context;
      }

      const projects = await DatabaseService.getProjects();
      const project = projects.find(p => p.id === session.projectId);
      if (!project) return undefined;

      const pc = await FileSystemService.getProjectContent(project.path, project.id);
      const files = pc.tree + '\n\n_Use \`read_file\`, \`search_codebase\`, and \`list_directory\` to explore file contents._';

      const context = { name: project.name, path: project.path, files };

      // Update cache
      projectContextCacheRef.current[session.projectId] = {
        context,
        timestamp: Date.now()
      };
      setProjectContext(context);

      return context;
    } catch {
      return undefined;
    }
  }, [uuid, setProjectContext]);

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
        isWebSearchEnabled: isWebSearchEnabledRef.current,
        abortSignal: options?.signal,
        previousModelName: previousModelRef.current || undefined,
        sessionId: uuid,
        projectContext,
        modeId: currentModeRef.current,
        projectId: projectIdRef.current || undefined,
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
    id: uuid,
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

  const handleRegenerate = useCallback((index: number) => {
    setMessages((prev) => {
      const userMsg = prev[index - 1];
      if (!userMsg || userMsg.role !== 'user') return prev;
      const assistantMsg = prev[index];
      if (!assistantMsg || assistantMsg.role === 'user') return prev;
      return prev.slice(0, index);
    });
    const rawMsg = rawMessages[index - 1];
    const userContent = rawMsg?.content;
    if (userContent) {
      setTimeout(() => sendMessage({ text: userContent }), 0);
    }
  }, [rawMessages, setMessages, sendMessage]);

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
        const session = await ChatSessionManager.getSession(uuid).catch(() => null);
        await initUsedModelsCache(session?.projectId || undefined, uuid);
        if (session && !sessionStorage.getItem('pending-first-message') && uuid !== 'new') {
          const storedMessages = await DatabaseService.getMessages(uuid);
          setMessages(storedMessages.map(mapUIMessageToLegacyMessage));
          setSessionId(uuid);
          setSessionTitle(session.title);
          if (session.projectId) setCurrentProjectId(session.projectId);
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
  }, [uuid, setMessages, setSessionId, setSessionTitle, clearArtifacts, setCurrentProjectId]);

  useEffect(() => {
    isThinkingEnabledRef.current = isThinkingEnabled;
  }, [isThinkingEnabled]);

  useEffect(() => {
    isWebSearchEnabledRef.current = isWebSearchEnabled;
  }, [isWebSearchEnabled]);

  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

  useEffect(() => {
    projectIdRef.current = currentProjectId;
  }, [currentProjectId]);

  const messages = useMemo(
    () => rawMessages.map(mapUIMessageToLegacyMessage).filter(Boolean) as any[],
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
    const handleResetChat = () => {
      setMessages([]);
    };
    window.addEventListener('reset-chat', handleResetChat);
    return () => window.removeEventListener('reset-chat', handleResetChat);
  }, [setMessages]);

  const titleGeneratedRef = useRef(false);
  const lastUuidRef = useRef<string | undefined>(undefined);

  const handleSend = useCallback(
    async (content: string) => {
      if (uuid === 'new') {
        const session = await ChatSessionManager.create('New conversation');
        setSessionId(session.id);
        sessionStorage.setItem('pending-first-message', content);
        navigate(`/thread/${session.id}`);
        return;
      }

      if (uuid) {
        const existingSession = await ChatSessionManager.getSession(uuid).catch(() => null);
        if (!existingSession) {
          const projects = await ChatSessionManager.getProjects();
          const project = projects.find(p => uuid.includes(p.id));
          if (project) {
            const session = await ChatSessionManager.create('New conversation', undefined, project.id);
            setSessionId(session.id);
            sessionStorage.setItem('pending-first-message', content);
            const slug = project.name.toLowerCase().replace(/\s+/g, '-');
            navigate(`/project/${slug}/${session.id}`);
            return;
          }
        }
      }

      const userMsg = {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content,
        createdAt: Date.now(),
      };

      if (uuid) {
        // Invalidate specific session cache on new send to ensure freshness if files changed externally
        const session = await ChatSessionManager.getSession(uuid).catch(() => null);
        if (session?.projectId) {
          delete projectContextCacheRef.current[session.projectId];
          setProjectContext(null);
        }

        DatabaseService.saveMessages(uuid, [userMsg]).catch((e) =>
          console.error('Failed to save user message to DB:', e)
        );
      }

      sendMessage({ text: content });

      if (lastUuidRef.current !== uuid) {
        titleGeneratedRef.current = false;
        lastUuidRef.current = uuid;
      }

      if (!titleGeneratedRef.current && uuid && uuid !== 'new') {
        const session = await ChatSessionManager.getSession(uuid).catch(() => null);
        const sessionTitle = session?.title || '';
        if (sessionTitle === 'New conversation' || sessionTitle === '') {
          setIsTitleGenerating(true);
          generateSessionTitle(content).then(async (generatedTitle) => {
            if (generatedTitle && generatedTitle !== 'New conversation') {
              await ChatSessionManager.rename(uuid, generatedTitle);
              const session = await ChatSessionManager.getSession(uuid).catch(() => null);
              window.dispatchEvent(new CustomEvent('session-title-changed', { detail: { projectId: session?.projectId } }));
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
    [uuid, sendMessage, navigate, setSessionId, setSessionTitle, setIsTitleGenerating, setProjectContext]
  );

  const handleAddProject = useCallback(async () => {
    try {
      projectContextCacheRef.current = {}; // Invalidate cache on project mutations
      setProjectContext(null);
      let newProject: Project | null = null;
      let folderName = '';
      if (isTauri()) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({ directory: true, multiple: false, title: 'Select Project Folder' });
        if (selected && typeof selected === 'string') {
          folderName = selected.split(/[/\\]/).pop() || 'New Project';
          newProject = await ChatSessionManager.createProject(folderName, selected);
        }
      } else if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        folderName = dirHandle.name || 'New Project';
        newProject = await ChatSessionManager.createProject(folderName, folderName);
        await FileSystemService.importDirectory(dirHandle, newProject.id);
      } else {
        addToast('Your browser does not support folder selection. Please use a supported browser or the desktop app.', 'error');
      }
      if (!newProject) return;
      window.dispatchEvent(new CustomEvent('projects-changed'));
      const newSession = await ChatSessionManager.create('New conversation', undefined, newProject.id);
      const slug = folderName.toLowerCase().replace(/\s+/g, '-');
      navigate(`/project/${slug}/${newSession.id}`);
    } catch (err) {
      console.error('Failed to open directory:', err);
      addToast('Could not open folder. Make sure the server is running and try again.', 'error');
    }
  }, [navigate, addToast, setProjectContext]);

  useEffect(() => {
    if (uuid && uuid !== 'new') {
      const pendingMessage = sessionStorage.getItem('pending-first-message');
      if (pendingMessage) {
        sessionStorage.removeItem('pending-first-message');
        handleSend(pendingMessage);
      }
    }
  }, [uuid, handleSend]);

  const handleOpenArtifact = useCallback(
    (artifact: Artifact) => {
      addArtifacts([artifact]);
      selectArtifact(artifact.identifier);
      openPanel();
    },
    [addArtifacts, selectArtifact, openPanel]
  );

  const [pendingConfirm, setPendingConfirm] = useState<{ tool: string; description: string } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setPendingConfirm(detail ? { tool: detail.tool, description: detail.description } : null);
    };
    window.addEventListener('tool-confirm-request', handler);
    return () => window.removeEventListener('tool-confirm-request', handler);
  }, []);

  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background relative">
      <PageGradient />
      {uuid !== 'new' && messages.length > 0 && (
        <TitleBar
          isProject={isProject}
          isIDEVisible={isIDEPanelOpen}
          isTerminalVisible={terminalVisible}
          onToggleIDE={() => setIsIDEPanelOpen(p => !p)}
          onToggleTerminal={toggleTerminal}
          onNewThread={isProject ? handleNewThread : undefined}
        />
      )}
      <div className="flex flex-1 min-h-0 relative z-10">
        <div
          className={`flex flex-col min-w-0 bg-background relative ${
            isMobile && (isPanelOpen || isIDEPanelOpen)
              ? 'hidden'
              : 'flex-1'
          }`}
        >
          <MessageList
            messages={messages}
            currentModel={currentModel}
            isLoading={isLoading}
            lastAssistantIndex={lastAssistantIndex}
            isThinkingEnabled={isThinkingEnabled}
            onToggleThinking={toggleThinking}
            isWebSearchEnabled={isWebSearchEnabled}
            onToggleWebSearch={toggleWebSearch}
            onOpenArtifact={handleOpenArtifact}
            onCopy={handleCopyMessage}
            onThumbsUp={handleThumbsUp}
            onThumbsDown={handleThumbsDown}
            onSend={handleSend}
            onRegenerate={handleRegenerate}
            onStop={stop}
            onAddProject={handleAddProject}
            onOpenIDE={openIDEPanel}
            currentProjectName={currentProjectName}
            currentMode={currentMode}
            onModeChange={handleModeChange}
            isProject={isProject}
            bottomSlot={pendingConfirm ? (
              <ConfirmDialog
                open
                mode="inline"
                title="Confirm Action"
                message={pendingConfirm.description}
                confirmLabel="Approve"
                cancelLabel="Deny"
                variant="default"
                onConfirm={() => {
                  approveToolConfirmation();
                  setPendingConfirm(null);
                }}
                onCancel={() => {
                  denyToolConfirmation();
                  setPendingConfirm(null);
                }}
              />
            ) : undefined}
          />
        </div>

        {isPanelOpen && artifacts.length > 0 && (
          <div
            ref={panelRef}
            className="flex overflow-hidden min-w-0"
            style={{ width: panelWidth, flex: 'none' }}
          >
            <div
              onMouseDown={startResize}
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
               <div className="w-px h-full bg-border group-hover/divider:bg-muted-foreground group-active/divider:bg-muted-foreground transition-colors" />
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

        {isIDEPanelOpen && (
          <div className="flex overflow-hidden min-w-0" style={{ width: idePanelWidth, flex: 'none' }}>
            <div
              onMouseDown={startIDEResize}
              onTouchStart={handleIDETouchStart}
              onKeyDown={handleIDEDividerKeyDown}
              tabIndex={0}
              role="separator"
              aria-orientation="vertical"
              aria-valuenow={idePanelWidth}
              aria-valuemin={IDE_PANEL_MIN_WIDTH}
              aria-valuemax={IDE_PANEL_MAX_WIDTH}
              className="w-[5px] shrink-0 cursor-col-resize bg-transparent relative flex items-center justify-center group/divider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset"
            >
              <div className="w-px h-full bg-border group-hover/divider:bg-muted-foreground group-active/divider:bg-muted-foreground transition-colors" />
            </div>
            {isMobile && (
              <div className="absolute inset-0 z-50 bg-black/30" onClick={closeIDEPanel} />
            )}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-sm font-semibold">IDE</span>
                <button
                  onClick={closeIDEPanel}
                  className="p-1 hover:bg-muted rounded-[6px] text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close IDE panel"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <IDEShell projectName={currentProjectName} projectFiles={projectFiles} />
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
};
