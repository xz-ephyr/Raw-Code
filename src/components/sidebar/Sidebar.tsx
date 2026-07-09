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
  Moon01Icon,
  Sun01Icon,
} from '@hugeicons/core-free-icons';
import SidebarTab from './SidebarTab';
import ProjectItem from './ProjectItem';

import { ChatSessionManager } from '@/services/ChatSessionManager';
import { FileSystemService } from '@core/workspace/FileSystemService';
import { Project } from '@/types/chat';
import { isTauri } from '@/lib/tauri';
import { useToast } from '../ui/Toast';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { useTheme } from '@/contexts/ThemeContext';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { theme, toggleTheme } = useTheme();

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
      } else if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        const folderName = dirHandle.name || 'New Project';
        const newProject = await ChatSessionManager.createProject(folderName, folderName);
        await FileSystemService.importDirectory(dirHandle, newProject.id);
        const allProjects = await ChatSessionManager.getProjects();
        setProjects(allProjects);
        const slug = folderName.toLowerCase().replace(/\s+/g, '-');
        navigate(`/project/${slug}-${newProject.id}`);
      } else {
        addToast('Your browser does not support folder selection. Please use a supported browser or the desktop app.', 'error');
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
        className={`bg-sidebar border-r border-sidebar-border h-screen transition-[width] duration-300 ease-in-out flex flex-col shrink-0 ${isCollapsed ? 'w-[48px]' : 'w-[320px]'}`}
      >
        <div className={`flex items-center shrink-0 ${isCollapsed ? 'p-2 justify-center' : 'pl-4 pr-2 py-2'}`}>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <img src="/favicon.png?v=2" alt="Logo" className="w-10 h-10 shrink-0" />
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="p-1 hover:bg-sidebar-accent rounded-[8px] shrink-0"
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
                <h2 className="text-sm font-bold text-muted-foreground whitespace-nowrap">Projects</h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate('/settings')}
                    className="text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent active:bg-accent p-1 rounded-[6px] transition-all active:scale-95"
                    aria-label="Permissions gateway"
                    title="Permissions gateway"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </button>
                  <button
                    onClick={handleAddProject}
                    className="text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent active:bg-accent p-1 rounded-[6px] transition-all active:scale-95"
                    aria-label="Add project"
                    title="Add project"
                  >
                    +
                  </button>
                </div>
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
                  <p className="text-[11px] text-muted-foreground px-2 italic">
                    Click + to add a project
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom section */}
        <div className="p-4 border-t border-sidebar-border shrink-0 flex flex-col gap-1">
          <SidebarTab
            iconElement={downloadIcon}
            label="Download app"
            path="#"
            onClick={handleDownloadApp}
            collapsed={isCollapsed}
          />
          {isCollapsed ? (
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex items-center justify-center py-1.5 rounded-[8px] cursor-pointer active:scale-[0.99] transition-transform hover:bg-sidebar-accent"
            >
              <div className="shrink-0 flex items-center justify-center w-[18px] h-[18px]">
                {theme === 'dark' ? <HugeiconRenderer icon={Sun01Icon} /> : <HugeiconRenderer icon={Moon01Icon} />}
              </div>
            </button>
          ) : (
            <div
              onClick={toggleTheme}
              className="flex items-center justify-between py-1.5 px-2 rounded-[8px] cursor-pointer hover:bg-sidebar-accent transition-colors"
            >
              <span className="text-sm font-medium">
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
                className={`relative w-9 h-5 rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-500' : 'bg-muted-foreground'}`}
              >
                <span className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          )}
          <SidebarTab
            iconElement={settingsIcon}
            label="Settings"
            path="/settings"
            collapsed={isCollapsed}
          />
        </div>
      </div>
    </>
  );
}
