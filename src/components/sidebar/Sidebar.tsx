import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  PencilEdit02Icon,
  ResourcesAddIcon,
  Settings02Icon,
  PanelLeftIcon,
  PanelRightIcon,
  FolderLibraryIcon,
  Download01Icon,
  CursorRectangleSelection02Icon,
  Moon01Icon,
  Sun01Icon,
  MoreVerticalIcon,
  ArchiveIcon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import SidebarTab from './SidebarTab';

import { ChatSessionManager } from '@/services/ChatSessionManager';
import type { ChatSession } from '@/types/chat';
import { isTauri } from '@/lib/tauri';
import { useToast } from '../ui/Toast';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { useTheme } from '@/contexts/ThemeContext';

const newThreadIcon = <HugeiconRenderer icon={PencilEdit02Icon} />;
const chatsIcon = <HugeiconRenderer icon={FolderLibraryIcon} />;
const pluginsIcon = <HugeiconRenderer icon={ResourcesAddIcon} />;
const downloadIcon = <HugeiconRenderer icon={Download01Icon} />;
const workflowIcon = <HugeiconRenderer icon={CursorRectangleSelection02Icon} />;
const settingsIcon = <HugeiconRenderer icon={Settings02Icon} />;

const MAX_THREADS = 15;

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [threads, setThreads] = useState<ChatSession[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const loadThreads = async () => {
      const all = await ChatSessionManager.getAll();
      all.sort((a, b) => b.createdAt - a.createdAt);
      setThreads(all.slice(0, MAX_THREADS));
    };
    loadThreads();

    const handleSessionChange = () => loadThreads();
    window.addEventListener('session-title-changed', handleSessionChange);
    window.addEventListener('projects-changed', handleSessionChange);
    window.addEventListener('thread-deleted', handleSessionChange);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('session-title-changed', handleSessionChange);
      window.removeEventListener('projects-changed', handleSessionChange);
      window.removeEventListener('thread-deleted', handleSessionChange);
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
      a.download = 'doktor-instructions.txt';
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

  return (
    <>
<div
        className={`bg-sidebar h-screen transition-[width] duration-300 ease-in-out flex flex-col shrink-0 ${isCollapsed ? 'w-[48px]' : 'w-[320px]'}`}
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
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-h-0 px-4 flex flex-col overflow-hidden">
              <div className="pt-5 pb-1 px-2 shrink-0 sticky top-0 bg-sidebar z-10">
                <h2 className="text-sm font-bold text-muted-foreground">Threads</h2>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 thin-scrollbar space-y-0.5 pr-1 pb-2">
                {threads.map((t) => (
                  <ThreadItem
                    key={t.id}
                    session={t}
                    isActive={location.pathname === `/thread/${t.id}`}
                    onNavigate={() => navigate(`/thread/${t.id}`)}
                    onRename={async (id, title) => {
                      await ChatSessionManager.rename(id, title);
                      window.dispatchEvent(new CustomEvent('session-title-changed'));
                    }}
                    onArchive={async (id) => {
                      await ChatSessionManager.archive(id);
                      window.dispatchEvent(new CustomEvent('projects-changed'));
                    }}
                    onDelete={async (id) => {
                      await ChatSessionManager.delete(id);
                      window.dispatchEvent(new CustomEvent('thread-deleted'));
                    }}
                  />
                ))}
                {threads.length === 0 && (
                  <p className="text-[11px] text-muted-foreground px-2 italic pt-1">
                    No threads yet
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

function ThreadItem({
  session,
  isActive,
  onNavigate,
  onRename,
  onArchive,
  onDelete,
}: {
  session: ChatSession;
  isActive: boolean;
  onNavigate: () => void;
  onRename: (id: string, title: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirmAsync } = useToast();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setIsMenuOpen(false);
  };

  const submitRename = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRename(session.id, editTitle);
    setIsEditing(false);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive(session.id);
    setIsMenuOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (await confirmAsync('Are you sure you want to delete this thread?')) {
      onDelete(session.id);
    }
    setIsMenuOpen(false);
  };

  return (
    <div
      className={`group relative w-full rounded-[6px] text-sm transition-colors ${
        isActive
          ? 'bg-sidebar-accent text-sidebar-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
      } ${isMenuOpen ? 'z-20' : ''}`}
    >
      <div className="flex items-center px-2 py-1.5">
        <button
          onClick={onNavigate}
          className="flex-1 min-w-0 text-left"
        >
          {isEditing ? (
            <form onSubmit={submitRename} onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => setIsEditing(false)}
                className="w-full bg-card border border-border rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </form>
          ) : (
            <span className="truncate block">{session.title}</span>
          )}
        </button>

        {!isEditing && (
          <div ref={menuRef} className="shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className={`p-0.5 rounded text-muted-foreground hover:text-sidebar-foreground transition-all opacity-0 group-hover:opacity-100 ${
                isMenuOpen ? 'opacity-100' : ''
              }`}
              aria-label="Thread actions"
            >
              <HugeiconRenderer icon={MoreVerticalIcon} size={14} />
            </button>

            {isMenuOpen && (
              <div className="fixed w-36 bg-sidebar border border-sidebar-border rounded-lg shadow-xl shadow-black/30 py-1 z-[9999]"
                style={{ top: 'auto', left: 'auto' }}
              >
                <button
                  onClick={handleRename}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-sidebar-accent transition-colors"
                >
                  <HugeiconRenderer icon={PencilEdit02Icon} size={13} className="text-muted-foreground" />
                  <span>Rename</span>
                </button>
                <button
                  onClick={handleArchive}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-sidebar-accent transition-colors"
                >
                  <HugeiconRenderer icon={ArchiveIcon} size={13} className="text-muted-foreground" />
                  <span>{session.archived ? 'Unarchive' : 'Archive'}</span>
                </button>
                <div className="h-px bg-sidebar-border my-1" />
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 transition-colors"
                >
                  <HugeiconRenderer icon={Delete02Icon} size={13} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
