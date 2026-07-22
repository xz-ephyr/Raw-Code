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
  Sparkles01Icon,
} from '@hugeicons/core-free-icons';
import SidebarTab from './SidebarTab';

import { ChatSessionManager } from '@/services/ChatSessionManager';
import type { ChatSession } from '@/types/chat';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { useProjectStore } from '@/stores/projectStore';
import ThreadItem from './ThreadItem';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';

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

  const handleNewThread = useCallback(() => {
    window.dispatchEvent(new CustomEvent('reset-chat'));
    navigate('/thread/new');
  }, [navigate]);

  return (
    <>
      <div
        className={`bg-sidebar h-full border-r border-sidebar-border transition-[width] duration-300 ease-in-out flex flex-col shrink-0 ${
          isCollapsed ? 'w-[64px]' : 'w-[280px]'
        }`}
      >
        {/* Header with collapse toggle */}
        <div className="flex items-center justify-between shrink-0 px-3 py-3 border-b border-sidebar-border">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <HugeiconRenderer icon={Sparkles01Icon} size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg text-sidebar-foreground">Raw-Code</span>
            </div>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className={`h-8 w-8 shrink-0 hover:bg-sidebar-accent rounded-lg transition-colors ${
                  isCollapsed ? 'ml-auto' : ''
                }`}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <HugeiconRenderer icon={PanelRightIcon} size={18} />
                ) : (
                  <HugeiconRenderer icon={PanelLeftIcon} size={18} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Main navigation */}
        <div
          className={`flex flex-col min-h-0 flex-1 ${
            isCollapsed ? 'overflow-hidden' : ''
          }`}
        >
          <div className={`shrink-0 space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
            <SidebarTab
              iconElement={<HugeiconRenderer icon={PencilEdit02Icon} size={18} />}
              label="New thread"
              path="/thread/new"
              active={location.pathname === '/thread/new'}
              collapsed={isCollapsed}
              onClick={handleNewThread}
            />
            <SidebarTab
              iconElement={<HugeiconRenderer icon={FolderLibraryIcon} size={18} />}
              label="Chats"
              path="/chats"
              active={location.pathname === '/chats'}
              collapsed={isCollapsed}
              onClick={() => navigate('/chats')}
            />
            <SidebarTab
              iconElement={<HugeiconRenderer icon={CursorRectangleSelection02Icon} size={18} />}
              label="Workflow"
              path="/workflow"
              active={location.pathname === '/workflow'}
              collapsed={isCollapsed}
              onClick={() => navigate('/workflow')}
            />
            <SidebarTab
              iconElement={<HugeiconRenderer icon={ResourcesAddIcon} size={18} />}
              label="Plugins"
              path="/plugins"
              active={location.pathname === '/plugins'}
              collapsed={isCollapsed}
              onClick={() => navigate('/plugins')}
            />
          </div>

          {/* Threads list */}
          {!isCollapsed && (
            <div className="flex-1 min-h-0 px-3 flex flex-col overflow-hidden">
              {pinned.length > 0 && (
                <div className="shrink-0 pb-2">
                  <div className="pt-4 pb-1 px-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Pinned
                    </span>
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

              <div className="flex-1 overflow-y-auto min-h-0 thin-scrollbar space-y-2 pr-1 pb-2">
                <div className="pt-4 pb-1 px-1 sticky top-0 bg-sidebar z-10">
                  <h2 className="text-sm font-bold text-sidebar-foreground/80">Threads</h2>
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

        {/* Footer with settings */}
        <div className="p-3 border-t border-sidebar-border shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className={`w-full justify-start gap-2 ${
                  isCollapsed ? 'justify-center' : ''
                }`}
              >
                <HugeiconRenderer icon={Settings02Icon} size={18} />
                {!isCollapsed && <span>Settings</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Settings
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  );
});

export default Sidebar;
