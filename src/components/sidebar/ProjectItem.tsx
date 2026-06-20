import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MoreVerticalIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Folder02Icon,
  PencilEdit02Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Project, ChatSession } from '../../types/chat';
import { ChatSessionManager } from '../../services/ChatSessionManager';

interface ProjectItemProps {
  project: Project;
  onDelete: (id: string) => void;
}

const HugeiconRenderer = ({
  icon: Icon,
  size = 16,
  className,
}: {
  icon: any;
  size?: number;
  className?: string;
}) => (
  <HugeiconsIcon
    icon={Icon}
    size={size}
    color="currentColor"
    strokeWidth={1.5}
    className={className}
  />
);

export default function ProjectItem({ project, onDelete }: ProjectItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const { uuid } = useParams();

  useEffect(() => {
    setSessions(ChatSessionManager.getAll(project.id));
  }, [project.id]);

  const handleNewChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newSession = ChatSessionManager.create(`${project.name} — Chat`, undefined, project.id);
    setSessions(ChatSessionManager.getAll(project.id));
    const slug = project.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/project/${slug}/${newSession.id}`);
  };

  return (
    <div className="mb-1" onMouseLeave={() => setShowMenu(false)}>
      <div
        className="flex items-center gap-3 p-2 hover:bg-[#f2f3f6] rounded-[8px] cursor-pointer group relative"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <HugeiconRenderer icon={Folder02Icon} />
        <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{project.name}</span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleNewChat}
            className="p-1 hover:bg-[#e5e5e5] rounded-[4px]"
            title="New Chat"
          >
            <HugeiconRenderer icon={PencilEdit02Icon} size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-[#e5e5e5] rounded-[4px]"
          >
            <HugeiconRenderer icon={MoreVerticalIcon} size={14} />
          </button>
          {isExpanded ? (
            <HugeiconRenderer icon={ArrowDown01Icon} size={14} />
          ) : (
            <HugeiconRenderer icon={ArrowUp01Icon} size={14} />
          )}
        </div>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project.id);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <HugeiconRenderer icon={Delete02Icon} size={14} />
              Delete Project
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="ml-4 border-l border-neutral-200 pl-2 mt-1 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => {
                const slug = project.name.toLowerCase().replace(/\s+/g, '-');
                navigate(`/project/${slug}/${session.id}`);
              }}
              className={`text-sm p-2 hover:bg-[#f2f3f6] rounded-[8px] flex items-center gap-3 group cursor-pointer active:scale-[0.99] transition-transform ${uuid === session.id ? 'bg-[#f2f3f6] text-black font-medium' : 'text-gray-600'}`}
            >
              <span className="flex-1 truncate">{session.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
