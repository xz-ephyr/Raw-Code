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
      .filter((part: any) => part.type === 'dynamic-tool' || part.type.startsWith('tool-'))
      .map((part: any) => {
        const toolName = part.toolName || part.type.replace(/^tool-/, '');
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

  const toggleThinking = () => setIsThinkingEnabled((prev) => !prev);

  // ✅ FIX #3: Refs hold the latest projectContext and project so the useChat transport
  // closure (created once at hook init) always reads the current values. Without this,
  // the transport captures empty-string projectContext from the very first render and
  // never sees updates — project file context was never actually sent to the AI.
  const projectContextRef = useRef('');
  const projectRef = useRef<Project | null>(null);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = 100 - (e.clientX / window.innerWidth) * 100;
        if (newWidth > 20 && newWidth < 80) {
          setPaneWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

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

  const currentModel = useMemo(() => getModelForChatRequest(uuid), [uuid]);

  const {
    messages: rawMessages,
    append,
    isLoading,
    stop,
    setMessages,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      fetch: async (_url: any, options: any) => {
        const body = JSON.parse(options?.body as string);
        const result = await chatCompletion({
          messages: body.messages,
          modelName: body.model,
          projectContext: projectContextRef.current,
          projectPath: projectRef.current?.path,
          isThinkingEnabled: isThinkingEnabled,
          abortSignal: options?.signal,
          previousModelName: previousModelRef.current || undefined,
        });

        // Update previous model ref after request starts
        previousModelRef.current = body.model;

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
      console.error('Chat stream failed:', getAIErrorMessage(chatError));
    },
    onFinish: async (event: any) => {
      if (uuid && uuid !== 'new') {
        await DatabaseService.saveMessages(uuid, [event.message]);
      }
      const message = mapUIMessageToLegacyMessage(event.message);
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
  }) as any;

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

  const messages = rawMessages.map(mapUIMessageToLegacyMessage);

  useEffect(() => {
    const handleResetChat = () => {
      setMessages([]);
    };
    window.addEventListener('reset-chat', handleResetChat);
    return () => window.removeEventListener('reset-chat', handleResetChat);
  }, [setMessages]);

  useEffect(() => {
    if (uuid && uuid !== 'new') {
      const pendingMessage = sessionStorage.getItem('pending-first-message');
      if (pendingMessage) {
        sessionStorage.removeItem('pending-first-message');
        handleSend(pendingMessage);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid]);

  const handleSend = useCallback(
    async (content: string) => {
      if (uuid === 'new') {
        const snippet = content.trim().slice(0, 60);
        const title = snippet.length > 0 ? snippet : 'New conversation';
        const session = await ChatSessionManager.create(title, undefined, project?.id || undefined);
        sessionStorage.setItem('pending-first-message', content);
        navigate(`/chat/${session.id}`);
        return;
      }

      const userMsg = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        createdAt: Date.now(),
      };

      if (uuid) {
        await DatabaseService.saveMessages(uuid, [userMsg]);
      }

      append(userMsg as any);
    },
    [uuid, append, navigate, project]
  );

  const activeArtifact = getActiveArtifact();
  const activeArtifactVersions = activeArtifactId ? getArtifactVersions(activeArtifactId) : [];

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.toolInvocations) {
      const artifactTool = lastMessage.toolInvocations.find(
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
          className={`flex-1 overflow-y-auto ${messages.length === 0 ? 'flex flex-col items-center justify-start pt-[15vh] p-4' : ''}`}
        >
          {messages.length > 0 && <div className="h-[20px] bg-white w-full shrink-0" />}
          <div className="w-full mx-auto px-4" style={{ maxWidth: 'min(780px, 100%)' }}>
            {error && (
              <div className="my-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {getAIErrorMessage(error)}
              </div>
            )}
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
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/30 transition-colors z-50 -ml-0.75"
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
