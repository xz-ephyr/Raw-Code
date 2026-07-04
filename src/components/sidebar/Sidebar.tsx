import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  PencilEdit02Icon,
  AlarmClockIcon,
  ResourcesAddIcon,
  TreePalmIcon,
  Settings02Icon,
  PanelLeftIcon,
  PanelRightIcon,
  FolderLibraryIcon,
  Download01Icon,
  CursorRectangleSelection02Icon,
} from '@hugeicons/core-free-icons';
import SidebarTab from './SidebarTab';
import ProjectItem from './ProjectItem';
import { SettingsModal } from '../settings/SettingsModal';
import { ChatSessionManager } from '@/services/ChatSessionManager';
import { FileSystemService } from '@core/workspace/FileSystemService';
import { Project } from '@/types/chat';
import { isTauri } from '@/lib/tauri';
import { useToast } from '../ui/Toast';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';

const newThreadIcon = <HugeiconRenderer icon={PencilEdit02Icon} />;
const chatsIcon = <HugeiconRenderer icon={FolderLibraryIcon} />;
const scheduleIcon = <HugeiconRenderer icon={AlarmClockIcon} />;
const pluginsIcon = <HugeiconRenderer icon={ResourcesAddIcon} />;
const wikiIcon = <HugeiconRenderer icon={TreePalmIcon} />;
const downloadIcon = <HugeiconRenderer icon={Download01Icon} />;
const workflowIcon = <HugeiconRenderer icon={CursorRectangleSelection02Icon} />;
const settingsIcon = <HugeiconRenderer icon={Settings02Icon} />;

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const loadProjects = async () => {
      const allProjects = await ChatSessionManager.getProjects();
      setProjects(allProjects);
    };
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadProjects();
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleProjectsChanged = () => {
      loadProjects();
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('projects-changed', handleProjectsChanged);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('projects-changed', handleProjectsChanged);
    };
  }, []);

  const handleDownloadApp = async () => {
    if (isTauri()) {
      addToast('You are already running the desktop version of the application!', 'info');
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      const infoText =
        'Thank you for downloading our app!\nTo run this app on your desktop, you can build it using Tauri by running `npm run tauri:build` in the project root folder.\n\nEnjoy the desktop experience!';
      const blob = new Blob([infoText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'raw-code-instructions.txt';
      a.click();
      URL.revokeObjectURL(url);
      addToast(
        "Tauri desktop app installation instructions downloaded! In web browser mode, you can also install this app as a PWA directly from your browser's address bar.",
        'info'
      );
    }
  };

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar_collapsed', String(nextState));
  };

  const handleAddProject = async () => {
    try {
      if (isTauri()) {
        // Desktop: use native folder-picker dialog
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: true,
          multiple: false,
          title: 'Select Project Folder',
        });
        if (selected && typeof selected === 'string') {
          const folderName = selected.split(/[/\\]/).pop() || 'New Project';
          const newProject = await ChatSessionManager.createProject(folderName, selected);
          const allProjects = await ChatSessionManager.getProjects();
          setProjects(allProjects);
          const slug = folderName.toLowerCase().replace(/\s+/g, '-');
          navigate(`/project/${slug}-${newProject.id}`);
        }
      } else {
        // Web: use File System Access API if available, otherwise prompt for a name
        if ('showDirectoryPicker' in window) {
          const dirHandle = await (window as any).showDirectoryPicker();
          const folderName = dirHandle.name || 'New Project';
          const projectPath = await FileSystemService.importDirectory(dirHandle);
          const newProject = await ChatSessionManager.createProject(folderName, projectPath);
          await FileSystemService.uploadProjectFiles(newProject.id, projectPath);
          const allProjects = await ChatSessionManager.getProjects();
          setProjects(allProjects);
          const slug = folderName.toLowerCase().replace(/\s+/g, '-');
          navigate(`/project/${slug}-${newProject.id}`);
        } else {
          const folderName = prompt('Enter a name for your project:');
          if (folderName) {
            const fakePath = `/web-projects/${folderName}`;
            const newProject = await ChatSessionManager.createProject(folderName, fakePath);
            const allProjects = await ChatSessionManager.getProjects();
            setProjects(allProjects);
            const slug = folderName.toLowerCase().replace(/\s+/g, '-');
            navigate(`/project/${slug}-${newProject.id}`);
          }
        }
      }
    } catch (err) {
      console.error('Failed to open directory:', err);
      addToast('Could not open folder. Make sure the server is running and try again.', 'error');
    }
  };

  const handleDeleteProject = useCallback(async (id: string) => {
    await ChatSessionManager.deleteProject(id);
    const allProjects = await ChatSessionManager.getProjects();
    setProjects(allProjects);
    if (location.pathname.includes('/chat/')) {
      navigate('/chats');
    }
  }, [location.pathname, navigate]);

  return (
    <>
      <div
        className={`bg-white border-r border-[#e5e5e5] h-screen transition-[width] duration-300 ease-in-out flex flex-col shrink-0 ${isCollapsed ? 'w-[48px]' : 'w-[320px]'}`}
      >
        <div className={`flex items-center shrink-0 ${isCollapsed ? 'p-2 justify-center' : 'pl-4 pr-2 py-2'}`}>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <img src="/favicon.png?v=2" alt="Logo" className="w-10 h-10 shrink-0" />
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="p-1 hover:bg-[#e5e5e5] rounded-[8px] shrink-0"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <HugeiconRenderer icon={PanelRightIcon} />
            ) : (
              <HugeiconRenderer icon={PanelLeftIcon} />
            )}
          </button>
        </div>

        <div
          className={`flex flex-col min-h-0 flex-1 ${isCollapsed ? 'overflow-hidden' : ''}`}
        >
          <div className={`shrink-0 ${isCollapsed ? 'px-1.5 overflow-hidden' : 'px-4'}`}>
            <SidebarTab
              iconElement={newThreadIcon}
              label="New thread"
              path="/thread/new"
              active={location.pathname === '/thread/new'}
              collapsed={isCollapsed}
              onClick={() => {
                if (location.pathname === '/thread/new') {
                  window.dispatchEvent(new CustomEvent('reset-chat'));
                }
              }}
            />
            <SidebarTab
              iconElement={chatsIcon}
              label="Chats"
              path="/chats"
              active={location.pathname === '/chats'}
              collapsed={isCollapsed}
            />
            <SidebarTab
              iconElement={scheduleIcon}
              label="Schedule"
              path="/schedule"
              active={location.pathname === '/schedule'}
              collapsed={isCollapsed}
            />
            <SidebarTab
              iconElement={workflowIcon}
              label="Workflow"
              path="/workflow"
              active={location.pathname === '/workflow'}
              collapsed={isCollapsed}
            />
            <SidebarTab
              iconElement={pluginsIcon}
              label="Plugins"
              path="/plugins"
              active={location.pathname === '/plugins'}
              collapsed={isCollapsed}
            />
            <SidebarTab
              iconElement={wikiIcon}
              label="Wiki"
              path="/wiki"
              active={location.pathname === '/wiki'}
              collapsed={isCollapsed}
            />
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-h-0 flex-1 px-4 overflow-hidden">
              <div className="mt-6 flex justify-between items-center mb-2 px-2 shrink-0">
                <h2 className="text-sm font-bold text-gray-500 whitespace-nowrap">Projects</h2>
                <button
                  onClick={handleAddProject}
                  className="text-gray-500 hover:text-black hover:bg-[#e5e5e5] active:bg-[#d4d4d4] p-1 rounded-[6px] transition-all active:scale-95"
                  aria-label="Add project"
                  title="Add project"
                >
                  +
                </button>
              </div>

              <div className="space-y-1 overflow-y-auto min-h-0 thin-scrollbar pr-3">
                {projects.map((project) => (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    onDelete={handleDeleteProject}
                  />
                ))}
                {projects.length === 0 && (
                  <p className="text-[11px] text-neutral-400 px-2 italic">
                    Click + to add a project
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom section */}
        <div className="p-4 border-t border-[#e5e5e5] shrink-0 flex flex-col gap-1">
          <SidebarTab
            iconElement={downloadIcon}
            label="Download app"
            path="#"
            onClick={handleDownloadApp}
            collapsed={isCollapsed}
          />
          <SidebarTab
            iconElement={settingsIcon}
            label="Settings"
            path="#"
            onClick={() => setIsSettingsOpen(true)}
            collapsed={isCollapsed}
          />
        </div>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
