import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useMatch } from 'react-router-dom';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ChatInput from '../components/chat/ChatInput';
import { UserBubble } from '../components/chat/UserBubble';
import { AssistantBubble } from '../components/chat/AssistantBubble';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { getModelForChatRequest } from '../config/models';
import { resolveProjectPath } from '../lib/projectPaths';
import { useArtifacts } from '../hooks/useArtifacts';
import { ArtifactPane } from '../components/artifacts/ArtifactPane';
import { chatCompletion, getAIErrorMessage } from '../services/aiService';
import { Project } from '../types/chat';
import { DatabaseService } from '../services/DatabaseService';
import { FileSystemService } from '../services/FileSystemService';
import { ProjectIDE } from '../components/artifacts/ProjectIDE';
import { IDEPromptModal } from '../components/chat/IDEPromptModal';
import { useToast } from '../components/ui/Toast';
import { mapUIMessageToLegacyMessage } from '../lib/chatUtils';
import { HugeiconRenderer } from '../components/ui/HugeiconRenderer';
import { ArrowDown02Icon } from '@hugeicons/core-free-icons';

export const ChatPage = () => {
  const { uuid } = useParams();
  const projectRouteMatch = useMatch('/project/:uuid');
  const projectFolderMatch = useMatch('/project/:folder/:uuid');
  const projectRouteId = projectRouteMatch?.params?.uuid ?? null;
  const projectFolderSlug = projectFolderMatch?.params?.folder ?? null;
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [projectContext, setProjectContext] = useState<string>('');
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [showIDEPrompt, setShowIDEPrompt] = useState(false);
  const [isIDEOpen, setIsIDEOpen] = useState(false);
  const [paneWidth, setPaneWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const lastProjectIdRef = useRef<string | null>(null);
  const previousModelRef = useRef<string | null>(null);
  const isThinkingEnabledRef = useRef(false);
  const currentModelRef = useRef<string | null>(null);
  const { addToast } = useToast();

  const toggleThinking = () => setIsThinkingEnabled((prev) => !prev);

  // Refs hold the latest values so the useChat transport closure (created once at hook init)
  // always reads current values. Without this, the transport captures stale initial values.
  const projectContextRef = useRef('');
  const projectRef = useRef<Project | null>(null);

const isResizingRef = useRef(false);

const scrollContainerRef = useRef<HTMLDivElement>(null);
const isNearBottomRef = useRef(true);
const [showScrollButton, setShowScrollButton] = useState(false);

const SCROLL_THRESHOLD = 150;

  const startResizing = useCallback(() => {
    isResizingRef.current = true;
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    isResizingRef.current = false;
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const newWidth = 100 - (e.clientX / window.innerWidth) * 100;
    if (newWidth > 20 && newWidth < 80) {
      setPaneWidth(newWidth);
    }
  }, []);

  useEffect(() => {
    if (isResizingRef.current) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

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

  const {
    activeArtifactId,
    setActiveArtifactId,
    setViewingVersion,
    isOpen: isArtifactOpen,
    setIsOpen: setIsArtifactOpen,
    addOrUpdateArtifact,
    updateArtifactContent,
    getArtifactVersions,
    getActiveArtifact,
    closeArtifact,
  } = useArtifacts();

  const loadProjectContext = useCallback(async (project: Project) => {
    const tree = await FileSystemService.getTree(project.path);
    const summary = FileSystemService.getCompressedTree(tree);
    setProjectContext(
      `Project: ${project.name}\nPath: ${project.path}\n\nFile Tree:\n${summary}`
    );
  }, []);

  const handleChatFinish = useCallback(
    async (event: any) => {
      const message = mapUIMessageToLegacyMessage(event.message);
      if (uuid && uuid !== 'new') {
        DatabaseService.saveMessages(uuid, [message]).catch((e) =>
          console.error('Failed to save assistant message to DB:', e)
        );
      }
      if (message.toolInvocations) {
        for (const toolInvocation of message.toolInvocations) {
          if (toolInvocation.state === 'result') {
            const toolName = toolInvocation.toolName;
            const result = toolInvocation.result;

            if (result && result.error) {
              console.error(`Tool ${toolName} failed:`, result.error);
              continue;
            }

            if (toolName === 'create_artifact') {
              const args = toolInvocation.args || {};
              const content = args.content || '';
              const path = args.path;
              const type = args.type || 'markdown';
              const title = args.title || path || 'Untitled Artifact';

              addOrUpdateArtifact(type, title, content);

              if (project && path) {
                try {
                  const fullPath = await resolveProjectPath(project.path, path);
                  if (!fullPath) continue;
                  await FileSystemService.saveFile(fullPath, content);
                  loadProjectContext(project);
                } catch (e) {
                  console.error('Failed to auto-save file:', e);
                }
              }
            } else if (toolName === 'write_file' || toolName === 'edit_file') {
              const path = toolInvocation.args.path;
              const content = result.content || toolInvocation.args.content;
              if (content) {
                const ext = path.split('.').pop() || '';
                const type = ['ts', 'tsx', 'js', 'jsx'].includes(ext)
                  ? 'react'
                  : ['html'].includes(ext)
                    ? 'html'
                    : 'markdown';
                addOrUpdateArtifact(type, path, content);
              }
              if (project) loadProjectContext(project);
            } else if (toolName === 'write_to_plan') {
              const { filename, content } = toolInvocation.args;
              addOrUpdateArtifact('markdown', filename, content);
              if (project) loadProjectContext(project);
            }
          }
        }
      }
    },
    [uuid, project, addOrUpdateArtifact, loadProjectContext]
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
    // eslint-disable-next-line react-hooks/refs
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
          projectContext: projectContextRef.current,
          projectPath: projectRef.current?.path,
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
        // Don't load from DB if there's a pending first message — it would
        // race with sendMessage and overwrite the user bubble + stream.
        if (!sessionStorage.getItem('pending-first-message') && uuid !== 'new') {
          const storedMessages = await DatabaseService.getMessages(uuid);
          setMessages(storedMessages.map(mapUIMessageToLegacyMessage));
        } else if (uuid === 'new') {
          setMessages([]);
        }

        const allSessions = await ChatSessionManager.getAll();
        const currentSession = allSessions.find((s) => s.id === uuid);

        if (currentSession?.projectId) {
          const allProjects = await ChatSessionManager.getProjects();
          const p = allProjects.find((proj) => proj.id === currentSession.projectId);
          if (p) {
            setProject(p);
            if (lastProjectIdRef.current !== p.id) {
              setShowIDEPrompt(true);
              lastProjectIdRef.current = p.id;
            }
            loadProjectContext(p);
          }
        } else if (projectRouteId) {
          const allProjects = await ChatSessionManager.getProjects();
          const p = allProjects.find((proj) => proj.id === projectRouteId);
          if (p) {
            setProject(p);
            if (lastProjectIdRef.current !== p.id) {
              setShowIDEPrompt(true);
              lastProjectIdRef.current = p.id;
            }
            loadProjectContext(p);
          }
        } else if (projectFolderSlug) {
          const allProjects = await ChatSessionManager.getProjects();
          const p = allProjects.find(
            (proj) => proj.name.toLowerCase().replace(/\s+/g, '-') === projectFolderSlug
          );
          if (p) {
            setProject(p);
            if (lastProjectIdRef.current !== p.id) {
              setShowIDEPrompt(true);
              lastProjectIdRef.current = p.id;
            }
            loadProjectContext(p);
          } else {
            setProject(null);
            setShowIDEPrompt(false);
            setIsIDEOpen(false);
            setProjectContext('');
            lastProjectIdRef.current = null;
          }
        } else {
          setProject(null);
          setShowIDEPrompt(false);
          setIsIDEOpen(false);
          setProjectContext('');
          lastProjectIdRef.current = null;
        }
      };
      loadSession();
    }
  }, [uuid, projectRouteId, projectFolderSlug, setMessages, loadProjectContext]);

  useEffect(() => {
    projectContextRef.current = projectContext;
  }, [projectContext]);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

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
      // On first send from /chat/new or /thread/new: create a real session and redirect to it.
      // The message is then sent in the new route context.
      if (uuid === 'new') {
        const snippet = content.trim().slice(0, 60);
        const title = snippet.length > 0 ? snippet : 'New conversation';
        const isProjectSession = location.pathname.startsWith('/project/');

        let session;
        if (isProjectSession && project) {
          session = await ChatSessionManager.create(title, undefined, project.id);
          sessionStorage.setItem('pending-first-message', content);
          const slug = project.name.toLowerCase().replace(/\s+/g, '-');
          navigate(`/project/${slug}/${session.id}`);
        } else {
          session = await ChatSessionManager.create(title);
          sessionStorage.setItem('pending-first-message', content);
          navigate(`/thread/${session.id}`);
        }
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
    [uuid, sendMessage, navigate, project]
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

  const activeArtifact = getActiveArtifact();
  const activeArtifactVersions = activeArtifactId ? getArtifactVersions(activeArtifactId) : [];

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const toolInvocations = lastMessage?.toolInvocations;
    if (Array.isArray(toolInvocations)) {
      const artifactTool = toolInvocations.find(
        (ti: any) => ti.toolName === 'create_artifact'
      );
      if (artifactTool?.state === 'result' && artifactTool?.args?.title) {
        const id = artifactTool.args.title.toLowerCase().replace(/\s+/g, '-');
        setActiveArtifactId(id);

        if (project && !isIDEOpen) {
          setIsArtifactOpen(true);
        } else if (!project) {
          setIsArtifactOpen(true);
        }
      }
    }
  }, [messages, setActiveArtifactId, setIsArtifactOpen, project, isIDEOpen]);

  useEffect(() => {
    const lastAssistant = [...rawMessages].reverse().find((m: any) => m.role === 'assistant');
    if (!lastAssistant?.parts) return;

    for (const part of lastAssistant.parts) {
      if (typeof part.type === 'string' && part.type.startsWith('tool-') && part.toolName === 'create_artifact') {
        if (!part.input) continue;

        let parsed: any;
        if (typeof part.input === 'string') {
          try { parsed = JSON.parse(part.input); } catch { continue; }
        } else if (typeof part.input === 'object' && part.input !== null) {
          parsed = part.input;
        } else {
          continue;
        }

        const title = parsed.title;
        if (!title) continue;

        const id = title.toLowerCase().replace(/\s+/g, '-');
        const content = parsed.content || '';

        setActiveArtifactId(id);

        if (project && !isIDEOpen) {
          setIsArtifactOpen(true);
        } else if (!project) {
          setIsArtifactOpen(true);
        }

        updateArtifactContent(id, content);
        break;
      }
    }
  }, [rawMessages, project, isIDEOpen, setActiveArtifactId, setIsArtifactOpen, updateArtifactContent, addOrUpdateArtifact]);

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
                  <>
                    <AssistantBubble
                      content={m.content}
                      model={currentModel}
                      isStreaming={
                        isLoading && messages.slice(i + 1).every((msg: any) => msg.role !== 'user')
                      }
                      toolInvocations={m.toolInvocations}
                      reasoning={m.reasoning}
                      artifactCards={m.toolInvocations?.filter(
                        (ti: any) => ti.toolName === 'create_artifact' && ti.state === 'result'
                      ).map((ti: any) => {
                        const title = ti.args?.title || 'Untitled Artifact';
                        const type = ti.args?.type || 'markdown';
                        const artifactId = title.toLowerCase().replace(/\s+/g, '-');
                        const content = ti.args?.content || ti.result?.content || '';
                        return { title, type, artifactId, content };
                      })}
                      onArtifactClick={(artifactId: string) => {
                        setActiveArtifactId(artifactId);
                        setViewingVersion(null);
                        if (project) {
                          setIsIDEOpen(true);
                        } else {
                          setIsArtifactOpen(true);
                        }
                      }}
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
                  </>
                )}
              </React.Fragment>
            ))}

            {messages.length === 0 && (
              <div className="w-full mt-4 flex flex-col items-center overflow-visible pb-10">
                <h1 className="text-[38px] font-serif-source mb-[10px] text-neutral-800 text-center">
                  {project ? `Working on ${project.name}` : 'Hello, how can I help?'}
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

      {(isArtifactOpen || isIDEOpen) && (
        <div
          style={{ width: `${paneWidth}%` }}
          className={`relative h-full flex flex-row shrink-0 ${isResizing ? 'select-none' : ''}`}
        >
          <div
            onMouseDown={startResizing}
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/30 transition-colors z-50 -ml-0.5"
          />

          {isArtifactOpen && !isIDEOpen && (
            <ArtifactPane
              isOpen={isArtifactOpen}
              onClose={closeArtifact}
              artifacts={activeArtifactVersions}
              activeArtifact={activeArtifact}
              onVersionSelect={(a: any) => {
                setViewingVersion(a.version);
              }}
            />
          )}

          {isIDEOpen && project && (
            <ProjectIDE
              key={`${project.id}-${projectContext.length}`}
              project={project}
              onClose={() => setIsIDEOpen(false)}
              onSave={() => loadProjectContext(project)}
            />
          )}
          </div>
        )}{/* closes artifact conditional */}
      </div>{/* closes row div */}

      {showIDEPrompt && (
        <IDEPromptModal
          onOpenIDE={() => {
            setIsIDEOpen(true);
            setShowIDEPrompt(false);
          }}
          onContinueChat={() => setShowIDEPrompt(false)}
        />
      )}
    </div>
  );
};
