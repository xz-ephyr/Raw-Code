import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useMatch } from 'react-router-dom';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ChatInput from '../components/chat/ChatInput';
import { UserBubble } from '../components/chat/UserBubble';
import { AssistantBubble } from '../components/chat/AssistantBubble';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { getModelForChatRequest } from '../config/models';
import { useArtifacts } from '../hooks/useArtifacts';
import { ArtifactPane } from '../components/artifacts/ArtifactPane';
import { ArtifactPreviewCard } from '../components/artifacts/ArtifactPreviewCard';
import { chatCompletion } from '../services/aiService';
import { Project } from '../types/chat';
import { FileSystemService } from '../services/FileSystemService';
import { ProjectIDE } from '../components/artifacts/ProjectIDE';
import { IDEPromptModal } from '../components/chat/IDEPromptModal';
import { isTauri } from '../lib/tauri';

// Safe path helpers — work in both Tauri and web environments
const safejoin = async (base: string, segment: string): Promise<string> => {
  if (isTauri()) {
    const { join } = await import('@tauri-apps/api/path');
    return join(base, segment);
  }
  // Web fallback: simple string join
  const sep = base.endsWith('/') ? '' : '/';
  return base + sep + segment;
};

const safeNormalize = async (p: string): Promise<string> => {
  if (isTauri()) {
    const { normalize } = await import('@tauri-apps/api/path');
    return normalize(p);
  }
  // Web fallback: collapse double slashes
  return p.replace(/\/+/g, '/');
};

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

  useEffect(() => {
    if (uuid) {
      const allSessions = ChatSessionManager.getAll();
      const currentSession = allSessions.find((s) => s.id === uuid);

      if (currentSession?.projectId) {
        const allProjects = ChatSessionManager.getProjects();
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
        // On /project/:uuid route — uuid IS the project id, not a session id
        const allProjects = ChatSessionManager.getProjects();
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
    }
  }, [uuid, projectRouteId]);

  const loadProjectContext = async (path: string) => {
    const tree = await FileSystemService.getTree(path);
    const summary = FileSystemService.getCompressedTree(tree);
    setProjectContext(summary);
  };

  // ✅ FIX #5: Evaluate model once per uuid, not on every render. In rotate mode,
  // getModelForChatRequest mutates localStorage on each call, so calling it every
  // render during streaming increments the rotation index repeatedly.
  const currentModel = useMemo(() => getModelForChatRequest(uuid), [uuid]);
  const apiKey = localStorage.getItem('api-key');

  // ✅ FIX #3: Keep refs in sync with state. The useChat transport is a stale closure —
  // it captures values at hook creation. Refs are always current regardless of closure age.
  useEffect(() => { projectContextRef.current = projectContext; }, [projectContext]);
  useEffect(() => { projectRef.current = project; }, [project]);

  const {
    messages: rawMessages,
    sendMessage,
    isLoading,
    stop,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      fetch: async (_url: any, options: any) => {
        const body = JSON.parse(options?.body as string);
        const result = await chatCompletion({
          messages: body.messages,
          modelName: body.model,
          projectContext: projectContextRef.current, // ✅ always current value
          projectPath: projectRef.current?.path, // ✅ always current value
          isThinkingEnabled: isThinkingEnabled,
        });
        return (result as any).toUIMessageStreamResponse();
      },
      body: {
        model: currentModel,
      },
    }),
    messages: [],
    onFinish: async (event: any) => {
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
              const { type, title, content, file_path } = toolInvocation.args;
              addOrUpdateArtifact(type, title, content);

              // Auto-save in project mode
              if (project && file_path) {
                try {
                  // Simple sanitization to prevent path traversal
                  const sanitizedPath = file_path.replace(/^(\.\.[/\\])+/, '');
                  const fullPath = await safejoin(project.path, sanitizedPath);
                  const normalizedProject = await safeNormalize(project.path);
                  const normalizedFull = await safeNormalize(fullPath);

                  if (normalizedFull.startsWith(normalizedProject)) {
                    await FileSystemService.saveFile(fullPath, content);
                    loadProjectContext(project.path);
                  } else {
                    console.error('Blocked attempted path traversal:', file_path);
                  }
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
              if (project) {
                loadProjectContext(project.path);
              }
            } else if (toolName === 'write_to_plan') {
              const { filename, content } = toolInvocation.args;
              addOrUpdateArtifact('markdown', filename, content);
              if (project) {
                loadProjectContext(project.path);
              }
            }
          }
        }
      }
    },
  }) as any;

  const messages = rawMessages.map(mapUIMessageToLegacyMessage);

  useEffect(() => {
    setMessages([]);
  }, [uuid, setMessages]);

  // Listen for the reset-chat event dispatched by the sidebar's "New thread" tab
  // This fires only when the user is already on /chat/new and clicks it again.
  useEffect(() => {
    const handleResetChat = () => {
      setMessages([]);
    };
    window.addEventListener('reset-chat', handleResetChat);
    return () => window.removeEventListener('reset-chat', handleResetChat);
  }, [setMessages]);

  // Pick up the pending first message stored before redirect from /chat/new
  useEffect(() => {
    if (uuid && uuid !== 'new') {
      const pendingMessage = sessionStorage.getItem('pending-first-message');
      if (pendingMessage) {
        sessionStorage.removeItem('pending-first-message');
        sendMessage({ text: pendingMessage });
      }
    }
  }, [uuid]); // intentionally omitting sendMessage to only run once on route change

  const handleSend = useCallback(
    async (content: string) => {
      // On first send from /chat/new: create a real session and redirect to it.
      // The message is then sent in the new route context.
      if (uuid === 'new') {
        const snippet = content.trim().slice(0, 60);
        const title = snippet.length > 0 ? snippet : 'New conversation';
        const session = ChatSessionManager.create(title);
        // Store the pending first message so the new ChatPage can pick it up
        sessionStorage.setItem('pending-first-message', content);
        navigate(`/chat/${session.id}`);
        return;
      }

      sendMessage({
        text: content,
      });
    },
    [uuid, apiKey, sendMessage, navigate]
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
          <div className="max-w-[720px] w-full mx-auto px-4">
            {messages.map((m: any, i: number) => (
              <React.Fragment key={m.id || i}>
                {m.role === 'user' ? (
                  <UserBubble content={m.content} />
                ) : (
                  <>
                    <AssistantBubble
                      content={m.content}
                      model={currentModel}
                      isStreaming={isLoading && i === messages.length - 1}
                      toolInvocations={m.toolInvocations}
                      reasoning={m.reasoning}
                      onCopy={() => navigator.clipboard.writeText(m.content)}
                      onThumbsUp={() => console.log('Thumbs up')}
                      onThumbsDown={() => console.log('Thumbs down')}
                      onRegenerate={() => {
                        const userMessage = messages[i - 1];
                        if (userMessage) {
                          sendMessage({ text: userMessage.content });
                        }
                      }}
                    />
                    {m.toolInvocations?.map((ti: any, idx: number) => {
                      const isArtifactTool = ti.toolName === 'create_artifact';
                      const isWriteFileTool = ti.toolName === 'write_file';
                      const isEditFileTool = ti.toolName === 'edit_file';
                      const isWritePlanTool = ti.toolName === 'write_to_plan';

                      if (
                        (isArtifactTool || isWriteFileTool || isEditFileTool || isWritePlanTool) &&
                        ti.state === 'result'
                      ) {
                        let title = '';
                        let type: any = 'markdown';

                        if (isArtifactTool) {
                          if (!ti.args?.title) return null;
                          title = ti.args.title;
                          type = ti.args.type || 'markdown';
                        } else if (isWriteFileTool || isEditFileTool) {
                          if (!ti.args?.file_path) return null;
                          title = ti.args.file_path;
                          const ext = title.split('.').pop() || '';
                          type = ['ts', 'tsx', 'js', 'jsx'].includes(ext)
                            ? 'react'
                            : ['html'].includes(ext)
                              ? 'html'
                              : 'markdown';
                        } else if (isWritePlanTool) {
                          if (!ti.args?.filename) return null;
                          title = ti.args.filename;
                          type = 'markdown';
                        }

                        if (!title) return null;
                        const artifactId = title.toLowerCase().replace(/\s+/g, '-');

                        return (
                          <ArtifactPreviewCard
                            key={idx}
                            title={title}
                            type={type}
                            onClick={() => {
                              setActiveArtifactId(artifactId);
                              setViewingVersion(null);
                              if (project) {
                                setIsIDEOpen(true);
                              } else {
                                setIsArtifactOpen(true);
                              }
                            }}
                          />
                        );
                      }
                      return null;
                    })}
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
          <div className="shrink-0 pb-8 w-full max-w-[720px] mx-auto px-4 bg-white">
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
