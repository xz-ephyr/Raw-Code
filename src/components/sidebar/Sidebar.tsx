import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  PencilEdit02Icon,
  ResourcesAddIcon,
  Settings02Icon,
  PanelLeftIcon,
  PanelRightIcon,
  FolderLibraryIcon,
  CursorRectangleSelection02Icon,
} from '@hugeicons/core-free-icons';
import SidebarTab from './SidebarTab';

import { ChatSessionManager } from '@/services/ChatSessionManager';
import type { ChatSession } from '@/types/chat';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { useProjectStore } from '@/stores/projectStore';
import ThreadItem from './ThreadItem';

const newThreadIcon = <HugeiconRenderer icon={PencilEdit02Icon} />;
const chatsIcon = <HugeiconRenderer icon={FolderLibraryIcon} />;
const pluginsIcon = <HugeiconRenderer icon={ResourcesAddIcon} />;
const workflowIcon = <HugeiconRenderer icon={CursorRectangleSelection02Icon} />;
const settingsIcon = <HugeiconRenderer icon={Settings02Icon} />;

const Sidebar = React.memo(function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [threads, setThreads] = useState<ChatSession[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const setSettingsOpen = useProjectStore((s) => s.setSettingsOpen);

  const loadThreads = async () => {
    const all = await ChatSessionManager.getAll();
    all.sort((a, b) => {
      const aTs = (a.updatedAt || a.createdAt);
      const bTs = (b.updatedAt || b.createdAt);
      return bTs - aTs;
    });
    setThreads(all);
  };

  useEffect(() => {
    loadThreads();

    const handleSessionChange = () => loadThreads();
    window.addEventListener('session-title-changed', handleSessionChange);
    window.addEventListener('projects-changed', handleSessionChange);
    window.addEventListener('thread-deleted', handleSessionChange);
    window.addEventListener('unread-changed', handleSessionChange);

    return () => {
      window.removeEventListener('session-title-changed', handleSessionChange);
      window.removeEventListener('projects-changed', handleSessionChange);
      window.removeEventListener('thread-deleted', handleSessionChange);
      window.removeEventListener('unread-changed', handleSessionChange);
    };
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar_collapsed', String(nextState));
  };

  const pinned = threads.filter((t) => t.pinned);
  const unpinned = threads.filter((t) => !t.pinned);

  const handleTogglePin = async (id: string, currentlyPinned: boolean) => {
    if (currentlyPinned) {
      await ChatSessionManager.unpin(id);
    } else {
      await ChatSessionManager.pin(id);
    }
    loadThreads();
  };

  const handleMarkRead = async (id: string) => {
    await ChatSessionManager.markAsRead(id);
    loadThreads();
  };

  const handleNavigate = useCallback((id: string) => {
    navigate(`/thread/${id}`);
  }, [navigate]);

  const handleRename = useCallback(async (id: string, title: string) => {
    await ChatSessionManager.rename(id, title);
    window.dispatchEvent(new CustomEvent('session-title-changed'));
  }, []);

  const handleArchiveItem = useCallback(async (id: string) => {
    await ChatSessionManager.archive(id);
    loadThreads();
  }, []);

  const handleDeleteItem = useCallback(async (id: string) => {
    await ChatSessionManager.delete(id);
    window.dispatchEvent(new CustomEvent('thread-deleted'));
  }, []);

  return (
    <>
      <div
        className={`bg-sidebar h-full border-r border-gray-500/10 dark:border-white/10 transition-[width] duration-300 ease-in-out flex flex-col shrink-0 ${isCollapsed ? 'w-[48px]' : 'w-[320px]'}`}
      >
        <div className="flex items-center shrink-0 justify-end px-2 py-2">
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
          <div className={`shrink-0 space-y-1 ${isCollapsed ? 'px-1.5 overflow-hidden' : 'px-4'}`}>
            <SidebarTab
              iconElement={newThreadIcon}
              label="New thread"
              path="/thread/new"
              active={location.pathname === '/thread/new'}
              collapsed={isCollapsed}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('reset-chat'));
              }}
            />
            <SidebarTab
              iconElement={chatsIcon}
              label="Chats"
              path="/chats"
              active={location.pathname === '/chats'}
              collapsed={isCollapsed}
              onClick={() => navigate('/chats')}
            />
            <SidebarTab
              iconElement={workflowIcon}
              label="Workflow"
              path="/workflow"
              active={location.pathname === '/workflow'}
              collapsed={isCollapsed}
              onClick={() => navigate('/workflow')}
            />
            <SidebarTab
              iconElement={pluginsIcon}
              label="Plugins"
              path="/plugins"
              active={location.pathname === '/plugins'}
              collapsed={isCollapsed}
              onClick={() => navigate('/plugins')}
            />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-h-0 px-4 flex flex-col overflow-hidden">
              {pinned.length > 0 && (
                <div className="shrink-0 pb-2">
                  <div className="pt-4 pb-1 px-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">Pinned</span>
                  </div>
                  <div className="space-y-0.5">
                    {pinned.map((t) => (
                      <ThreadItem
                        key={t.id}
                        session={t}
                        isActive={location.pathname === `/thread/${t.id}`}
                        onNavigate={() => handleNavigate(t.id)}
                        onRename={handleRename}
                        onArchive={handleArchiveItem}
                        onDelete={handleDeleteItem}
                        onTogglePin={handleTogglePin}
                        onMarkRead={handleMarkRead}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto min-h-0 thin-scrollbar space-y-2 pr-2 pb-2">
                <div className="pt-4 pb-1 px-2 sticky top-0 bg-sidebar z-10">
                  <h2 className="text-sm font-bold text-muted-foreground">Threads</h2>
                </div>

                <div className="space-y-0.5">
                  {unpinned.map((t) => (
                    <ThreadItem
                      key={t.id}
                      session={t}
                      isActive={location.pathname === `/thread/${t.id}`}
                      onNavigate={() => handleNavigate(t.id)}
                      onRename={handleRename}
                      onArchive={handleArchiveItem}
                      onDelete={handleDeleteItem}
                      onTogglePin={handleTogglePin}
                      onMarkRead={handleMarkRead}
                    />
                  ))}
                </div>

                {threads.length === 0 && (
                  <p className="text-[11px] text-muted-foreground px-2 italic pt-1">
                    No threads yet
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-sidebar-border shrink-0 flex flex-col gap-1">
          <SidebarTab
            iconElement={settingsIcon}
            label="Settings"
            onClick={() => setSettingsOpen(true)}
            collapsed={isCollapsed}
          />
        </div>
      </div>
    </>
  );
});

export default Sidebar;
