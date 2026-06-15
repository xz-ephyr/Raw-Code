// Your rules resume
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PencilEdit02Icon, AlarmClockIcon, ResourcesAddIcon, TreePalmIcon, Settings02Icon, PanelLeftIcon, PanelRightIcon, FolderLibraryIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import SidebarTab from './SidebarTab';
import ProjectItem from './ProjectItem';
import { SettingsModal } from '../settings/SettingsModal';
import { ChatSessionManager } from '../../services/ChatSessionManager';
import { Project } from '../../types/chat';
// @ts-ignore
import { open } from '@tauri-apps/plugin-dialog';

// Helper component to render Hugeicons in SidebarTabs
const HugeiconRenderer = ({ icon: Icon, size = 18 }: { icon: any, size?: number }) => (
  <HugeiconsIcon icon={Icon} size={size} color="currentColor" strokeWidth={1.5} />
);

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setProjects(ChatSessionManager.getProjects());
  }, []);

  const handleAddProject = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Folder'
      });

      if (selected && typeof selected === 'string') {
        const folderName = selected.split(/[/\\]/).pop() || 'New Project';
        const newProject = ChatSessionManager.createProject(folderName, selected);
        setProjects(ChatSessionManager.getProjects());

        // Create initial chat for project
        const session = ChatSessionManager.create('Project initialization', newProject.id);
        navigate(`/chat/${session.id}`);
      }
    } catch (err) {
      console.error('Failed to open directory:', err);
    }
  };

  const handleDeleteProject = (id: string) => {
    ChatSessionManager.deleteProject(id);
    setProjects(ChatSessionManager.getProjects());
    if (location.pathname.includes('/chat/')) {
        navigate('/chats');
    }
  };

  return (
    <>
      <div 
        className={`bg-[#f9f9f9] border-r border-[#e5e5e5] h-screen transition-[width] duration-300 ease-in-out flex flex-col shrink-0 ${isCollapsed ? 'w-[48px]' : 'w-[320px]'}`}
      >
        <div className="flex justify-end p-2 shrink-0">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-[#e5e5e5] rounded-[8px]"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <HugeiconRenderer icon={PanelRightIcon} /> : <HugeiconRenderer icon={PanelLeftIcon} />}
          </button>
        </div>

        <div className={`px-4 flex-1 ${isCollapsed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <>
            <SidebarTab 
              icon={() => <HugeiconRenderer icon={PencilEdit02Icon} />} 
              label="New thread" 
              path="/chat/new" 
              active={location.pathname === '/chat/new'}
              collapsed={isCollapsed} 
            />
            <SidebarTab 
              icon={() => <HugeiconRenderer icon={FolderLibraryIcon} />} 
              label="Chats" 
              path="/chats" 
              active={location.pathname === '/chats'}
              collapsed={isCollapsed} 
            />
            <SidebarTab 
              icon={() => <HugeiconRenderer icon={AlarmClockIcon} />} 
              label="Schedule" 
              path="/schedule" 
              active={location.pathname === '/schedule'}
              collapsed={isCollapsed} 
            />
            <SidebarTab 
              icon={() => <HugeiconRenderer icon={ResourcesAddIcon} />} 
              label="Plugins" 
              path="/plugins" 
              active={location.pathname === '/plugins'}
              collapsed={isCollapsed} 
            />
            <SidebarTab 
              icon={() => <HugeiconRenderer icon={TreePalmIcon} />} 
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
                    className="text-gray-500 hover:text-black hover:bg-[#e5e5e5] active:bg-[#d4d4d4] p-1 rounded-[4px] transition-all active:scale-95"
                  >
                    +
                  </button>
                </div>
                
                <div className="space-y-1">
                  {projects.map(project => (
                    <ProjectItem
                        key={project.id}
                        project={project}
                        onDelete={handleDeleteProject}
                    />
                  ))}
                  {projects.length === 0 && (
                    <p className="text-[11px] text-neutral-400 px-2 italic">Click + to add a project</p>
                  )}
                </div>
              </>
            )}
          </>
        </div>

        {/* Bottom section */}
        <div className="p-4 border-t border-[#e5e5e5] shrink-0">
          <SidebarTab 
            icon={() => <HugeiconRenderer icon={Settings02Icon} />} 
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
