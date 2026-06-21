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

const mapUIMessageToLegacyMessage = (m: any): any => {
  if (!m) return m;

  // Extract content from parts if missing
  let content = m.content || '';
  if (!content && Array.isArray(m.parts)) {
    content = m.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('');
  }

  // Extract reasoning from parts if missing
  let reasoning = m.reasoning || '';
  if (!reasoning && Array.isArray(m.parts)) {
    reasoning = m.parts
      .filter((part: any) => part.type === 'reasoning')
      .map((part: any) => part.reasoning || (part as any).text || '')
      .join('');
  }

  // Extract toolInvocations from parts
  let toolInvocations = m.toolInvocations;
  if (!toolInvocations && Array.isArray(m.parts)) {
    toolInvocations = m.parts
      .filter((part: any) => part.type === 'dynamic-tool' || (part.type && part.type.startsWith('tool-')))
      .map((part: any) => {
        const toolName = part.toolName || (part.type ? part.type.replace(/^tool-/, '') : 'unknown');
        return {
          state:
            part.state === 'output-available'
              ? 'result'
              : part.state === 'input-available'
                ? 'call'
                : part.state,
          toolCallId: part.toolCallId,
          toolName: toolName,
          args: part.input,
          result: part.output,
          error: part.errorText,
        };
      });
  }

  return {
    ...m,
    content,
    reasoning,
    toolInvocations,
  };
};

export const ChatPage = () => {
  const { uuid } = useParams();
  const projectRouteMatch = useMatch('/project/:uuid');
  // If on /project/:uuid route, load the project directly by its id
  const projectRouteId = projectRouteMatch?.params?.uuid ?? null;
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
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
      isNearBottomRef.current = near;
    }
  }, []);

  const {
    activeArtifactId,
    setActiveArtifactId,
    setViewingVersion,
    isOpen: isArtifactOpen,
    setIsOpen: setIsArtifactOpen,
    addOrUpdateArtifact,
    getArtifactVersions,
    getActiveArtifact,
    closeArtifact,
  } = useArtifacts();

  const loadProjectContext = async (path: string) => {
    const tree = await FileSystemService.getTree(path);
    const summary = FileSystemService.getCompressedTree(tree);
    setProjectContext(summary);
  };

  const [modelRevision, setModelRevision] = useState(0);

  useEffect(() => {
    const handler = () => setModelRevision((v) => v + 1);
    window.addEventListener('model-changed', handler);
    return () => window.removeEventListener('model-changed', handler);
  }, []);

  const currentModel = useMemo(() => getModelForChatRequest(uuid), [uuid, modelRevision]);

  const chat = useChat({
    // eslint-disable-next-line react-hooks/refs
    transport: new DefaultChatTransport({
      fetch: async (_url: any, options: any) => {
        if (!options?.body) {
          throw new Error('Request body is missing');
        }
        const body = JSON.parse(options.body as string);
        const result = await chatCompletion({
          messages: body.messages,
          modelName: currentModelRef.current || body.model,
          projectContext: projectContextRef.current,
          projectPath: projectRef.current?.path,
          isThinkingEnabled: isThinkingEnabledRef.current,
          abortSignal: options?.signal,
          previousModelName: previousModelRef.current || undefined,
          sessionId: uuid,
        });

        // Update previous model ref after request starts
        if (body.model) {
          previousModelRef.current = body.model;
        }

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
    onFinish: async (event: any) => {
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
              const type = args.type || 'markdown';
              const title = args.title || 'Untitled Artifact';
              const content = args.content || '';
              const file_path = args.file_path;
              addOrUpdateArtifact(type, title, content);

              if (project && file_path) {
                try {
                  const fullPath = await resolveProjectPath(project.path, file_path);
                  if (!fullPath) continue;
                  await FileSystemService.saveFile(fullPath, content);
                  loadProjectContext(project.path);
                } catch (e) {
                  console.error('Failed to auto-save file:', e);
                }
              }
            } else if (toolName === 'write_file' || toolName === 'edit_file') {
              const file_path = toolInvocation.args.file_path;
              const content = result.content || toolInvocation.args.content;
              if (content) {
                const ext = file_path.split('.').pop() || '';
                const type = ['ts', 'tsx', 'js', 'jsx'].includes(ext)
                  ? 'react'
                  : ['html'].includes(ext)
                    ? 'html'
                    : 'markdown';
                addOrUpdateArtifact(type, file_path, content);
              }
              if (project) loadProjectContext(project.path);
            } else if (toolName === 'write_to_plan') {
              const { filename, content } = toolInvocation.args;
              addOrUpdateArtifact('markdown', filename, content);
              if (project) loadProjectContext(project.path);
            }
          }
        }
      }
    },
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
        if (uuid !== 'new') {
          const storedMessages = await DatabaseService.getMessages(uuid);
          setMessages(storedMessages.map(mapUIMessageToLegacyMessage));
        } else {
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
            loadProjectContext(p.path);
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
            loadProjectContext(p.path);
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
  }, [uuid, projectRouteId, setMessages]);

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
      el.scrollTop = el.scrollHeight;
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

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div className={`flex flex-col flex-1 min-w-0 bg-white transition-all duration-300 relative`}>
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`flex-1 overflow-y-auto ${messages.length === 0 ? 'flex flex-col items-center justify-start pt-[15vh] p-4' : ''}`}
        >
          {messages.length > 0 && <div className="h-[20px] bg-white w-full shrink-0" />}
          <div className="w-full mx-auto px-4" style={{ maxWidth: 'min(780px, 100%)' }}>
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
                      estimatedTokens={Math.round(((m.content?.length || 0) + (m.reasoning?.length || 0)) / 4)}
                      toolInvocations={m.toolInvocations}
                      reasoning={m.reasoning}
                      artifactCards={m.toolInvocations?.filter(
                        (ti: any) => ti.toolName === 'create_artifact' && ti.state === 'result'
                      ).map((ti: any) => {
                        const title = ti.args?.title || 'Untitled Artifact';
                        const type = ti.args?.type || 'markdown';
                        const artifactId = title.toLowerCase().replace(/\s+/g, '-');
                        return { title, type, artifactId };
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
              onSave={() => loadProjectContext(project.path)}
            />
          )}
        </div>
      )}

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
