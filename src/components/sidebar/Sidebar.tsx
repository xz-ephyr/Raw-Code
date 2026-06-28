import { useState, useEffect, useRef } from 'react';
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
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import SidebarTab from './SidebarTab';
import ProjectItem from './ProjectItem';
import { SettingsModal } from '../settings/SettingsModal';
import { ChatSessionManager } from '../../services/ChatSessionManager';
import { FileSystemService } from '../../services/FileSystemService';
import { Project } from '../../types/chat';
import { isTauri } from '../../lib/tauri';
import { useToast } from '../ui/Toast';


const HugeiconRenderer = ({ icon: Icon, size = 18 }: { icon: any; size?: number }) => (
  <HugeiconsIcon icon={Icon} size={size} color="currentColor" strokeWidth={1.5} />
);

const newThreadIcon = <HugeiconRenderer icon={PencilEdit02Icon} />;
const chatsIcon = <HugeiconRenderer icon={FolderLibraryIcon} />;
const scheduleIcon = <HugeiconRenderer icon={AlarmClockIcon} />;
const pluginsIcon = <HugeiconRenderer icon={ResourcesAddIcon} />;
const wikiIcon = <HugeiconRenderer icon={TreePalmIcon} />;
const downloadIcon = <HugeiconRenderer icon={Download01Icon} />;
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
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    const loadProjects = async () => {
      const allProjects = await ChatSessionManager.getProjects();
      setProjects(allProjects);
    };
    loadProjects();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
      a.download = 'xz-desktop-app-instructions.txt';
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

  const handleDeleteProject = async (id: string) => {
    await ChatSessionManager.deleteProject(id);
    const allProjects = await ChatSessionManager.getProjects();
    setProjects(allProjects);
    if (location.pathname.includes('/chat/')) {
      navigate('/chats');
    }
  };

  return (
    <>
      <div
        className={`bg-white border-r border-[#e5e5e5] h-screen transition-[width] duration-300 ease-in-out flex flex-col shrink-0 ${isCollapsed ? 'w-[48px]' : 'w-[320px]'}`}
      >
        <div className={`flex p-2 shrink-0 ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            onClick={toggleCollapse}
            className="p-1 hover:bg-[#e5e5e5] rounded-[8px]"
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
          className={`flex-1 ${isCollapsed ? 'px-1.5 overflow-hidden' : 'px-4 overflow-y-auto'}`}
        >
          <>
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

            {!isCollapsed && (
              <>
                <div className="mt-6 flex justify-between items-center mb-2 px-2">
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

                <div className="space-y-1">
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
              </>
            )}
          </>
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
