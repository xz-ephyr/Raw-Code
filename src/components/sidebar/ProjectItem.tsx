import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MoreVerticalIcon, Folder02Icon, PencilEdit02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { ChatSession } from '../../types/chat';
import { ChatSessionManager } from '../../services/ChatSessionManager';
import { HugeiconRenderer } from '../common/HugeiconRenderer';
import { getProjectSlug } from '../../lib/slugs';
export default function ProjectItem({ project, onDelete }: any) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const { uuid } = useParams();
  useEffect(() => { ChatSessionManager.getAll(project.id).then(setSessions); }, [project.id]);
  const handleNewChat = async (e: any) => {
    e.stopPropagation();
    const s = await ChatSessionManager.create(`${project.name} — Chat`, undefined, project.id);
    ChatSessionManager.getAll(project.id).then(setSessions);
    navigate(`/project/${getProjectSlug(project.name)}/${s.id}`);
  };
  return (
    <div className="mb-1" onMouseLeave={() => setShowMenu(false)}>
      <div className="flex items-center gap-3 p-2 hover:bg-[#f2f3f6] rounded-[8px] cursor-pointer group relative" onClick={() => setIsExpanded(!isExpanded)}>
        <HugeiconRenderer icon={Folder02Icon} />
        <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{project.name}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <button onClick={handleNewChat} className="p-1 hover:bg-[#e5e5e5] rounded-[4px]"><HugeiconRenderer icon={PencilEdit02Icon} size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="p-1 hover:bg-[#e5e5e5] rounded-[4px]"><HugeiconRenderer icon={MoreVerticalIcon} size={14} /></button>
        </div>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50">
            <button onClick={(e) => { e.stopPropagation(); onDelete(project.id); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><HugeiconRenderer icon={Delete02Icon} size={14} />Delete</button>
          </div>
        )}
      </div>
      {isExpanded && (
        <div className="ml-4 border-l border-neutral-200 pl-2 mt-1 space-y-1">
          {sessions.map((s) => (
            <div key={s.id} onClick={() => navigate(`/project/${getProjectSlug(project.name)}/${s.id}`)} className={`text-sm p-2 hover:bg-[#f2f3f6] rounded-[8px] flex items-center gap-3 group cursor-pointer ${uuid === s.id ? 'bg-[#f2f3f6] text-black font-medium' : 'text-gray-600'}`}>
              <span className="flex-1 truncate">{s.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
