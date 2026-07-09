import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MoreVerticalIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Folder02Icon,
  PencilEdit02Icon,
  Delete02Icon,
  ArchiveIcon,
} from '@hugeicons/core-free-icons';
import { Project, ChatSession } from '@/types/chat';
import { ChatSessionManager } from '@/services/ChatSessionManager';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface ProjectItemProps {
  project: Project;
  onDelete: (id: string) => void;
}

/**
 * ProjectItem component with React.memo to optimize rendering performance in large sidebars.
 */
const ProjectItem = React.memo(({ project, onDelete }: ProjectItemProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [sessionMenuId, setSessionMenuId] = useState<string | null>(null);
  const [sessionMenuPos, setSessionMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteSession, setConfirmDeleteSession] = useState<string | null>(null);
  const navigate = useNavigate();
  const { uuid } = useParams();

  useEffect(() => {
    let cancelled = false;
    const loadSessions = async () => {
      const allSessions = await ChatSessionManager.getAll(project.id);
      if (!cancelled) setSessions(allSessions);
    };
    loadSessions();

    const handleTitleChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.projectId === project.id) {
        loadSessions();
      }
    };

    const handleClickOutside = () => {
      setShowMenu(false);
      setMenuPos(null);
      setSessionMenuId(null);
      setSessionMenuPos(null);
    };

    window.addEventListener('session-title-changed', handleTitleChanged);
    document.addEventListener('click', handleClickOutside);
    return () => {
      cancelled = true;
      window.removeEventListener('session-title-changed', handleTitleChanged);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [project.id]);

  const handleRenameSession = async (sessionId: string) => {
    if (editTitle.trim()) {
      await ChatSessionManager.rename(sessionId, editTitle.trim());
      window.dispatchEvent(new CustomEvent('session-title-changed', { detail: { projectId: project.id } }));
    }
    setEditingSessionId(null);
  };

  const handleArchiveSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    await ChatSessionManager.archive(sessionId);
    window.dispatchEvent(new CustomEvent('session-title-changed', { detail: { projectId: project.id } }));
    setSessionMenuId(null);
    setSessionMenuPos(null);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setConfirmDeleteSession(sessionId);
    setSessionMenuId(null);
    setSessionMenuPos(null);
  };

  const handleConfirmDeleteSession = async () => {
    if (confirmDeleteSession) {
      await ChatSessionManager.delete(confirmDeleteSession);
      window.dispatchEvent(new CustomEvent('session-title-changed', { detail: { projectId: project.id } }));
    }
    setConfirmDeleteSession(null);
  };

  const handleCancelDeleteSession = () => {
    setConfirmDeleteSession(null);
  };

  const handleNewChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newSession = await ChatSessionManager.create('New conversation', undefined, project.id);
    const allSessions = await ChatSessionManager.getAll(project.id);
    setSessions(allSessions);
    const slug = project.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/project/${slug}/${newSession.id}`);
  };

  return (
    <>
      <div className="mb-1">
        <div
          className="flex items-center gap-3 p-2 hover:bg-sidebar-accent rounded-[8px] cursor-pointer group"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <HugeiconRenderer icon={Folder02Icon} />
          <span className="text-sm font-semibold text-sidebar-foreground flex-1 truncate">{project.name}</span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleNewChat}
              className="p-1 hover:bg-sidebar-accent rounded-[6px]"
              title="New Chat"
              aria-label="New Chat"
            >
              <HugeiconRenderer icon={PencilEdit02Icon} size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setMenuPos({ top: rect.bottom + 4, left: rect.right - 128 });
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-sidebar-accent rounded-[6px]"
              title="Project options"
              aria-label="Project options"
            >
              <HugeiconRenderer icon={MoreVerticalIcon} size={14} />
            </button>
            {isExpanded ? (
              <HugeiconRenderer icon={ArrowDown01Icon} size={14} />
            ) : (
              <HugeiconRenderer icon={ArrowUp01Icon} size={14} />
            )}
          </div>
        </div>

        {showMenu && menuPos && (
            <div
                    className="fixed w-32 bg-card border border-sidebar-border rounded-xl shadow-lg py-1 z-[9999]"
              style={{ top: menuPos.top, left: menuPos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project.id);
                  setShowMenu(false);
                  setMenuPos(null);
                }}
                className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-[8px] mx-1 flex items-center gap-2"
              >
              <HugeiconRenderer icon={Delete02Icon} size={14} />
              Delete Project
            </button>
          </div>
        )}

        {isExpanded && (
          <div className="mt-1 space-y-1">
            {sessions.filter(s => !s.archived).map((session) => (
              <Fragment key={session.id}>
                <div
                  className={`group flex items-center text-sm py-1 px-2 hover:bg-sidebar-accent rounded-[8px] cursor-pointer active:scale-[0.99] transition-transform ${uuid === session.id ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-muted-foreground'}`}
                  onClick={() => {
                    const slug = project.name.toLowerCase().replace(/\s+/g, '-');
                    navigate(`/project/${slug}/${session.id}`);
                  }}
                >
                  {editingSessionId === session.id ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleRenameSession(session.id); }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 flex"
                    >
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => setEditingSessionId(null)}
                        className="w-full bg-card border border-border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </form>
                  ) : (
                    <span className="flex-1 truncate">{session.title}</span>
                  )}
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mr-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setSessionMenuPos({ top: rect.bottom + 2, left: rect.right - 128 });
                        setSessionMenuId(sessionMenuId === session.id ? null : session.id);
                      }}
                      className="p-1 hover:bg-muted rounded-[6px] text-muted-foreground"
                      aria-label="Session actions"
                    >
                      <HugeiconRenderer icon={MoreVerticalIcon} size={15} />
                    </button>
                  </div>
                </div>
                {sessionMenuId === session.id && sessionMenuPos && (
                  <div
              className="fixed w-32 bg-card border border-sidebar-border rounded-xl shadow-lg py-1 z-[9999]"
                    style={{ top: sessionMenuPos.top, left: sessionMenuPos.left }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTitle(session.title);
                        setEditingSessionId(session.id);
                        setSessionMenuId(null);
                        setSessionMenuPos(null);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-sidebar-foreground hover:bg-muted flex items-center gap-2"
                    >
                      <HugeiconRenderer icon={PencilEdit02Icon} size={13} className="text-muted-foreground" />
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleArchiveSession(e, session.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-sidebar-foreground hover:bg-muted flex items-center gap-2"
                    >
                      <HugeiconRenderer icon={ArchiveIcon} size={13} className="text-muted-foreground" />
                      Archive
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2"
                    >
                      <HugeiconRenderer icon={Delete02Icon} size={13} className="text-destructive" />
                      Delete
                    </button>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDeleteSession}
        mode="modal"
        title="Delete Chat"
        message="Are you sure you want to delete this chat?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteSession}
        onCancel={handleCancelDeleteSession}
      />
    </>
  );
});

export default ProjectItem;
