import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PencilEdit02Icon, PanelLeftIcon, PanelRightIcon, FolderLibraryIcon } from '@hugeicons/core-free-icons';
import SidebarTab from './SidebarTab';
import ProjectItem from './ProjectItem';
import { SettingsModal } from '../settings/SettingsModal';
import { ChatSessionManager } from '../../services/ChatSessionManager';
import { FileSystemService } from '../../services/FileSystemService';
import { Project } from '../../types/chat';
import { isTauri } from '../../lib/tauri';
import { HugeiconRenderer } from '../common/HugeiconRenderer';
import { getProjectSlug } from '../../lib/slugs';
export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => { ChatSessionManager.getProjects().then(setProjects); }, []);
  const handleAddProject = async () => {
    try {
      if (isTauri()) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const s = await open({ directory: true, multiple: false });
        if (s && typeof s === 'string') {
          const name = s.split(/[/\\]/).pop() || 'New';
          const p = await ChatSessionManager.createProject(name, s);
          ChatSessionManager.getProjects().then(setProjects);
          navigate(`/project/${getProjectSlug(name)}-${p.id}`);
        }
      } else if ('showDirectoryPicker' in window) {
        const h = await (window as any).showDirectoryPicker();
        const p = await ChatSessionManager.createProject(h.name, await FileSystemService.importDirectory(h));
        ChatSessionManager.getProjects().then(setProjects);
        navigate(`/project/${getProjectSlug(h.name)}-${p.id}`);
      }
    } catch (e) { console.error(e); }
  };
  const handleDeleteProject = async (id: string) => {
    const cur = location.pathname.split('/').slice(2).join('/');
    await ChatSessionManager.deleteProject(id);
    const all = await ChatSessionManager.getProjects();
    setProjects(all);
    if (cur.includes(id)) navigate('/chats');
  };
  return (
    <>
      <div className={`bg-[#f9f9f9] border-r border-[#e5e5e5] h-screen transition-[width] duration-300 ease-in-out flex flex-col shrink-0 ${isCollapsed ? 'w-[48px]' : 'w-[320px]'}`}>
        <div className={`flex p-2 shrink-0 ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
          <button onClick={() => { setIsCollapsed(!isCollapsed); localStorage.setItem('sidebar_collapsed', String(!isCollapsed)); }} className="p-1 hover:bg-[#e5e5e5] rounded-[8px]">
            {isCollapsed ? <HugeiconRenderer icon={PanelRightIcon} /> : <HugeiconRenderer icon={PanelLeftIcon} />}
          </button>
        </div>
        <div className={`flex-1 ${isCollapsed ? 'px-1.5 overflow-hidden' : 'px-4 overflow-y-auto'}`}>
          <SidebarTab icon={() => <HugeiconRenderer icon={PencilEdit02Icon} />} label="New thread" path="/thread/new" active={location.pathname === '/thread/new'} collapsed={isCollapsed} onClick={() => { if (location.pathname === '/thread/new') window.dispatchEvent(new CustomEvent('reset-chat')); }} />
          <SidebarTab icon={() => <HugeiconRenderer icon={FolderLibraryIcon} />} label="Chats" path="/chats" active={location.pathname === '/chats'} collapsed={isCollapsed} />
          {!isCollapsed && (
            <><div className="mt-6 flex justify-between items-center mb-2 px-2"><h2 className="text-sm font-bold text-gray-500">Projects</h2><button onClick={handleAddProject} className="text-gray-500 hover:text-black hover:bg-[#e5e5e5] p-1 rounded-[4px]">+</button></div>
            <div className="space-y-1">{projects.map(p => <ProjectItem key={p.id} project={p} onDelete={handleDeleteProject} />)}</div></>
          )}
        </div>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
