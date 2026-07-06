import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { FolderLibraryIcon, Download01Icon } from '@hugeicons/core-free-icons';
import { ChatSessionManager } from '@/services/ChatSessionManager';
import { FileSystemService } from '@core/workspace/FileSystemService';
import { isTauri } from '@/lib/tauri';
import { Project } from '@/types/chat';

interface ProjectSetupStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ProjectSetupStep({ onComplete, onSkip }: ProjectSetupStepProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    ChatSessionManager.getProjects().then(setProjects);
  }, []);

  const handleCreateProject = async () => {
    setIsCreating(true);
    try {
      if (isTauri()) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: true,
          multiple: false,
          title: 'Select Project Folder',
        });
        if (selected && typeof selected === 'string') {
          const folderName = selected.split(/[/\\]/).pop() || 'My Project';
          await ChatSessionManager.createProject(folderName, selected);
          const allProjects = await ChatSessionManager.getProjects();
          setProjects(allProjects);
        }
      } else if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        const folderName = dirHandle.name || 'My Project';
        const projectPath = await FileSystemService.importDirectory(dirHandle);
        const newProject = await ChatSessionManager.createProject(folderName, projectPath);
        await FileSystemService.uploadProjectFiles(newProject.id, projectPath);
        const allProjects = await ChatSessionManager.getProjects();
        setProjects(allProjects);
      }
    } catch {
      // user cancelled
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelect = (projectId: string) => {
    setSelectedProjectId(projectId === selectedProjectId ? null : projectId);
  };

  const handleConfirm = () => {
    onComplete();
  };

  return (
    <div className="flex flex-col max-w-lg mx-auto gap-6 py-4 w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Connect a Project</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Give the AI context by connecting your codebase.
        </p>
      </div>

      <button
        onClick={handleCreateProject}
        disabled={isCreating}
        className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-border transition-colors bg-muted/50 hover:bg-muted text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <HugeiconsIcon icon={Download01Icon} size={18} className="text-muted-foreground" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">
            {isCreating ? 'Opening folder picker...' : 'Add an existing project'}
          </div>
          <div className="text-xs text-muted-foreground">Choose a folder from your computer</div>
        </div>
      </button>

      {projects.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            — or select a previous project —
          </div>
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleSelect(project.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border w-full text-left transition-all ${
                selectedProjectId === project.id
                  ? 'border-ring bg-muted'
                  : 'border-border hover:border-border'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={FolderLibraryIcon} size={16} className="text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{project.name}</div>
                <div className="text-xs text-muted-foreground truncate max-w-[300px]">{project.path}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onSkip}
          className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground font-medium text-sm hover:bg-muted transition-all"
        >
          Skip for now
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-2.5 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/80 transition-all active:scale-[0.98] disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
