import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '@ai-sdk/react';
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
// @ts-ignore
import { join, normalize } from '@tauri-apps/api/path';

export const ChatPage = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [projectContext, setProjectContext] = useState<string>('');
  const [showIDEPrompt, setShowIDEPrompt] = useState(false);
  const [isIDEOpen, setIsIDEOpen] = useState(false);
  const [paneWidth, setPaneWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const lastProjectIdRef = useRef<string | null>(null);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = 100 - (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) {
        setPaneWidth(newWidth);
      }
    }
  }, [isResizing]);

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
    closeArtifact
  } = useArtifacts();

  useEffect(() => {
    if (uuid) {
      const allSessions = ChatSessionManager.getAll();
      const currentSession = allSessions.find(s => s.id === uuid);

      if (currentSession?.projectId) {
        const allProjects = ChatSessionManager.getProjects();
        const p = allProjects.find(proj => proj.id === currentSession.projectId);
        if (p) {
            setProject(p);
            // Only show prompt if switching to a DIFFERENT project
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
  }, [uuid]);

  const loadProjectContext = async (path: string) => {
    const tree = await FileSystemService.getTree(path);
    const summary = FileSystemService.getCompressedTree(tree);
    setProjectContext(summary);
  };

  const currentModel = getModelForChatRequest(uuid);
  const apiKey = localStorage.getItem('api-key');

  const { messages, append, isLoading, setMessages } = useChat({
    // @ts-ignore
    fetch: async (url: any, options: any) => {
        const body = JSON.parse(options?.body as string);
        const result = await chatCompletion({
            messages: body.messages,
            apiKey: body.apiKey,
            modelName: body.model,
            projectContext: projectContext
        });
        return result.toTextStreamResponse();
    },
    initialMessages: [],
    body: {
      model: currentModel,
      apiKey: apiKey,
    },
    onFinish: async (message: any) => {
      if (message.toolInvocations) {
        for (const toolInvocation of message.toolInvocations) {
          if (toolInvocation.toolName === 'create_artifact' && toolInvocation.state === 'result') {
            const { type, title, content, file_path } = toolInvocation.args;

            addOrUpdateArtifact(type, title, content);

            // Auto-save in project mode
            if (project && file_path) {
                try {
                    // Simple sanitization to prevent path traversal
                    const sanitizedPath = file_path.replace(/^(\.\.[/\\])+/, '');
                    const fullPath = await join(project.path, sanitizedPath);
                    const normalizedProject = await normalize(project.path);
                    const normalizedFull = await normalize(fullPath);

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
          }
        }
      }
    },
  }) as any;

  useEffect(() => {
    setMessages([]);
  }, [uuid, setMessages]);

  const handleSend = useCallback(async (content: string) => {
    if (!apiKey) {
      alert('Please set your Google API Key in settings.');
      return;
    }

    if (uuid === 'new') {
      const newSession = ChatSessionManager.create(content.slice(0, 30) + '...', content.slice(0, 100));
      navigate(`/chat/${newSession.id}`, { replace: true });
    }

    append({
      role: 'user',
      content,
    });
  }, [uuid, apiKey, append]);

  const activeArtifact = getActiveArtifact();
  const activeArtifactVersions = activeArtifactId ? getArtifactVersions(activeArtifactId) : [];

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.toolInvocations) {
      const artifactTool = lastMessage.toolInvocations.find((ti: any) => ti.toolName === 'create_artifact');
      if (artifactTool?.state === 'result') {
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
        <div className={`flex-1 overflow-y-auto ${messages.length === 0 ? 'flex flex-col items-center justify-center p-4' : ''}`}>
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
                    />
                    {m.toolInvocations?.map((ti: any, idx: number) => {
                      if (ti.toolName === 'create_artifact' && ti.state === 'result') {
                        return (
                          <ArtifactPreviewCard
                            key={idx}
                            title={ti.args.title}
                            type={ti.args.type}
                            onClick={() => {
                              setActiveArtifactId(ti.args.title.toLowerCase().replace(/\s+/g, '-'));
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
              <div className="w-full mt-4 flex flex-col items-center">
                <h1 className="text-[43px] font-serif-source mb-[10px] text-neutral-800 text-center">
                    {project ? `Working on ${project.name}` : 'Hello, how can I help?'}
                </h1>
                <ChatInput onSend={handleSend} isLoading={isLoading} />
              </div>
            )}
          </div>
        </div>

        {messages.length > 0 && (
          <div className="shrink-0 pb-8 w-full max-w-[720px] mx-auto px-4 bg-white">
            <ChatInput onSend={handleSend} isLoading={isLoading} />
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
