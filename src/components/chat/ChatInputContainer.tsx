import { type ReactNode, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Folder02Icon, ArrowDown01Icon, ArrowUp01Icon, PlusSignIcon } from '@hugeicons/core-free-icons';
import ChatInput from './ChatInput';
import { ChatSessionManager } from '@/services/ChatSessionManager';
import type { Project } from '@/types/chat';

interface ChatInputContainerProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
  onCreateProject?: () => void;
  onOpenIDE?: () => void;
  currentProjectName?: string;
  currentModel?: string;
  idle?: boolean;
  children?: ReactNode;
  currentMode?: string;
  onModeChange?: (modeId: string | undefined) => void;
  isProject?: boolean;
}

export default function ChatInputContainer({
  onSend,
  onStop,
  isLoading,
  isThinkingEnabled,
  onToggleThinking,
  onCreateProject,
  onOpenIDE,
  currentProjectName,
  currentModel,
  idle,
  children,
  currentMode,
  onModeChange,
  isProject,
}: ChatInputContainerProps) {
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null);
  const displayName = selectedProjectName || currentProjectName || 'New Project';
  const projectRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isProjectOpen) return;
    ChatSessionManager.getProjects().then(all => {
      setProjects(all);
    });
  }, [isProjectOpen]);

  useEffect(() => {
    if (!isProjectOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setIsProjectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProjectOpen]);

  const handleProjectClick = async (project: Project) => {
    setIsProjectOpen(false);
    setSelectedProjectName(project.name);
    const newSession = await ChatSessionManager.create('New conversation', undefined, project.id);
    const slug = project.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/project/${slug}/${newSession.id}`);
  };

  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: 'min(880px, 100%)' }}>
      {idle ? (
        <div className="relative">
          <div
            className="absolute left-0 right-0 bg-background rounded-[12px]"
            style={{ height: '155px', top: 0 }}
          >
            <div className="absolute bottom-2 left-2">
              <div className="relative" ref={projectRef}>
                <button
                  type="button"
                  onClick={() => setIsProjectOpen(!isProjectOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-muted-foreground hover:bg-muted transition-colors text-sm"
                  title="Projects"
                  aria-label="Projects"
                >
                  <HugeiconsIcon icon={Folder02Icon} size={16} />
                  <span>{displayName}</span>
                  <HugeiconsIcon icon={isProjectOpen ? ArrowUp01Icon : ArrowDown01Icon} size={14} />
                </button>
                {isProjectOpen && (
                  <div className="absolute top-full mt-1 left-0 w-56 bg-card border border-border rounded-xl shadow-lg py-1 z-50 max-h-64 overflow-y-auto">
                    {projects.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-muted-foreground">No projects yet</div>
                    ) : (
                      projects.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => handleProjectClick(project)}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-muted text-foreground flex items-center gap-2.5"
                        >
                          <HugeiconsIcon icon={Folder02Icon} size={15} className="text-muted-foreground shrink-0" />
                          <span className="truncate">{project.name}</span>
                        </button>
                      ))
                    )}
                    <div className="h-px bg-border my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsProjectOpen(false);
                        onCreateProject?.();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-muted text-foreground flex items-center gap-2.5"
                    >
                      <HugeiconsIcon icon={PlusSignIcon} size={15} className="text-muted-foreground shrink-0" />
                      <span>Create New</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProjectOpen(false);
                        onOpenIDE?.();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-muted text-foreground flex items-center gap-2.5"
                    >
                      <img src="/wiki-folder.png" alt="" className="w-5 h-[14px] shrink-0" />
                      <span>Open IDE</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <ChatInput
            onSend={onSend}
            onStop={onStop}
            isLoading={isLoading}
            isIdle={true}
            isThinkingEnabled={isThinkingEnabled}
            onToggleThinking={onToggleThinking}
            currentModel={currentModel}
            currentMode={currentMode}
            onModeChange={onModeChange}
            isProject={isProject}
          />
          {children}
        </div>
      ) : (
        <ChatInput
          onSend={onSend}
          onStop={onStop}
          isLoading={isLoading}
          isIdle={false}
            isThinkingEnabled={isThinkingEnabled}
          onToggleThinking={onToggleThinking}
          currentModel={currentModel}
          currentMode={currentMode}
          onModeChange={onModeChange}
          isProject={isProject}
        />
      )}
    </div>
  );
}
