// Your rules resume
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SquarePen, AlarmClock, Toolbox, SunMoon, Settings, PanelLeft, PanelRight, GalleryVerticalEnd } from 'lucide-react';
import SidebarTab from './SidebarTab';
import { ChatSessionManager } from '../../services/ChatSessionManager';
import ProjectItem from './ProjectItem';
import ChatsList from './ChatsList';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleNewThread = () => {
    const session = ChatSessionManager.create('New Chat');
    navigate(`/chat/${session.id}`);
  };

  return (
    <div 
      className={`bg-[#f9f9f9] border-r border-[#e5e5e5] h-screen transition-[width] duration-300 ease-in-out flex flex-col ${isCollapsed ? 'w-[48px]' : 'w-[320px]'}`}
    >
      <div className="flex justify-end p-2 shrink-0">
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 hover:bg-[#e5e5e5] rounded-[8px]">
          {isCollapsed ? <PanelRight size={18} /> : <PanelLeft size={18} />}
        </button>
      </div>

      <div className={`px-4 flex-1 ${isCollapsed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <>
          <SidebarTab
            icon={SquarePen}
            label="New thread"
            path="#"
            collapsed={isCollapsed}
            onClick={(e) => {
              e.preventDefault();
              handleNewThread();
            }}
          />
          <SidebarTab icon={GalleryVerticalEnd} label="Chats" path="/chats" collapsed={isCollapsed} />
          <ChatsList collapsed={isCollapsed} />
          <SidebarTab icon={AlarmClock} label="Schedule" path="/schedule" collapsed={isCollapsed} />
          <SidebarTab icon={Toolbox} label="Plugins" path="/plugins" collapsed={isCollapsed} />
          <SidebarTab icon={SunMoon} label="Wiki" path="/wiki" collapsed={isCollapsed} />
          
          {!isCollapsed && (
            <>
              <div className="mt-6 flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-500 whitespace-nowrap">Projects</h2>
                <button className="text-gray-500 hover:text-black hover:bg-[#e5e5e5] active:bg-[#d4d4d4] p-1 rounded-[4px] transition-all active:scale-95">+</button>
              </div>
              
              <div className="mt-2">
                <ProjectItem name="Project Alpha" />
              </div>
            </>
          )}
        </>
      </div>

      {/* Bottom section */}
      <div className="p-4 border-t border-[#e5e5e5] shrink-0">
        <SidebarTab icon={Settings} label="Settings" path="/settings" collapsed={isCollapsed} />
      </div>
    </div>
  );
}
