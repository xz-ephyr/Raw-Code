import { type ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Folder02Icon, ArrowDown01Icon, ArrowUp01Icon, PlusSignIcon, CheckmarkBadge01Icon, ThumbsUpIcon, BanIcon } from '@hugeicons/core-free-icons';
import ChatInput from './ChatInput';
import { Dropdown } from '../ui/Dropdown';
import { ChatSessionManager } from '@/services/ChatSessionManager';
import type { Project } from '@/types/chat';

interface ChatInputContainerProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
  isWebSearchEnabled: boolean;
  onToggleWebSearch: () => void;
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

type PermissionMode = 'always-ask' | 'auto-approve' | 'restrict';

const PERMISSION_OPTIONS: { id: PermissionMode; label: string; desc: string; icon: any }[] = [
  { id: 'always-ask', label: 'Always Ask', desc: 'Prompt before accessing files or devices', icon: CheckmarkBadge01Icon },
  { id: 'auto-approve', label: 'Auto Approve', desc: 'Automatically allow all access', icon: ThumbsUpIcon },
  { id: 'restrict', label: 'Restrict', desc: 'Block all file and device access', icon: BanIcon },
];

export default function ChatInputContainer({
  onSend,
  onStop,
  isLoading,
  isThinkingEnabled,
  onToggleThinking,
  isWebSearchEnabled,
  onToggleWebSearch,
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
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('always-ask');
  const [isPermissionOpen, setIsPermissionOpen] = useState(false);
  const displayName = selectedProjectName || currentProjectName || 'New Project';
  const navigate = useNavigate();

  useEffect(() => {
    if (!isProjectOpen) return;
    ChatSessionManager.getProjects().then(all => {
      setProjects(all);
    });
  }, [isProjectOpen]);

  const currentPerm = PERMISSION_OPTIONS.find(o => o.id === permissionMode)!;

  const handleProjectClick = async (project: Project) => {
    setIsProjectOpen(false);
    setSelectedProjectName(project.name);
    const newSession = await ChatSessionManager.create('New conversation', undefined, project.id);
    const slug = project.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/project/${slug}/${newSession.id}`);
  };

  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: 'min(880px, 100%)' }}>
      <div className="relative">
        <div
          className="absolute left-0 right-0 bg-background rounded-[12px]"
          style={{ height: idle ? '155px' : 'calc(100% - 8px)', top: idle ? 0 : '4px' }}
        >
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <div className="relative">
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
              <Dropdown
                isOpen={isProjectOpen}
                onClose={() => setIsProjectOpen(false)}
                width="224px"
                maxHeight="256px"
              >
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
              </Dropdown>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPermissionOpen(!isPermissionOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-muted-foreground hover:bg-muted transition-colors text-sm"
                title="Permission Mode"
                aria-label="Permission Mode"
              >
                <HugeiconsIcon icon={currentPerm.icon} size={16} />
                <span>{currentPerm.label}</span>
                <HugeiconsIcon icon={isPermissionOpen ? ArrowUp01Icon : ArrowDown01Icon} size={14} />
              </button>
              <Dropdown
                isOpen={isPermissionOpen}
                onClose={() => setIsPermissionOpen(false)}
                width="224px"
              >
                {PERMISSION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPermissionMode(opt.id);
                      setIsPermissionOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs hover:bg-muted flex items-center gap-2.5 ${
                      permissionMode === opt.id ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    <HugeiconsIcon icon={opt.icon} size={15} className="shrink-0" />
                    <div className="flex flex-col">
                      <span className={permissionMode === opt.id ? 'font-semibold text-foreground' : 'text-foreground'}>{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground/60 leading-tight">{opt.desc}</span>
                    </div>
                  </button>
                ))}
              </Dropdown>
            </div>
          </div>
        </div>
        <ChatInput
          onSend={onSend}
          onStop={onStop}
          isLoading={isLoading}
          isIdle={idle}
          isThinkingEnabled={isThinkingEnabled}
          onToggleThinking={onToggleThinking}
          isWebSearchEnabled={isWebSearchEnabled}
          onToggleWebSearch={onToggleWebSearch}
          currentModel={currentModel}
          currentMode={currentMode}
          onModeChange={onModeChange}
          isProject={isProject}
        />
        {children}
      </div>
    </div>
  );
}
