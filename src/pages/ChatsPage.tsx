import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChatSession } from '../types/chat';
import { ChatSessionManager } from '@/services/ChatSessionManager';
import { ChatListItem } from '../components/chat/ChatListItem';
import { ChatSearchBar } from '../components/chat/ChatSearchBar';
import { ChatsEmptyState } from '../components/chat/ChatsEmptyState';
import {
  ArchiveIcon,
  Delete02Icon,
  Download01Icon,
  FilterIcon,
  DashboardSquare01Icon,
  ListViewIcon,
  SparklesIcon,
  CheckIcon,
  SquareIcon,
  StarIcon,
} from '@hugeicons/core-free-icons';
import { Dropdown } from '../components/ui/Dropdown';
import { HugeiconRenderer } from '../components/ui/HugeiconRenderer';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';

type ViewMode = 'list' | 'dashboard';
type FilterOption = 'active' | 'archived';

interface ChatWithMeta extends ChatSession {
  messageCount: number;
  isPinned: boolean;
}

export const ChatsPage = () => {
  const [chats, setChats] = useState<ChatWithMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterOption>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const { addToast } = useToast();

  const refreshChats = useCallback(async () => {
    const allChats = await ChatSessionManager.getAll();
    const withMeta: ChatWithMeta[] = allChats.map((chat) => ({
      ...chat,
      messageCount: 0,
      isPinned: false,
    }));
    setChats(withMeta);
  }, []);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  const filteredChats = useMemo(() => {
    let result = chats
      .filter((chat) => {
        const matchesSearch =
          chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());

        if (filter === 'archived') return chat.archived && matchesSearch;
        return !chat.archived && matchesSearch;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
      });

    return result;
  }, [chats, searchQuery, filter]);

  const pinnedCount = chats.filter((c) => c.isPinned).length;
  const archivedCount = chats.filter((c) => c.archived).length;
  const activeCount = chats.filter((c) => !c.archived).length;

  const handleDelete = useCallback(async (id: string) => {
    await ChatSessionManager.delete(id);
    await refreshChats();
    addToast('Chat deleted');
  }, [refreshChats, addToast]);

  const handleArchive = useCallback(async (id: string) => {
    await ChatSessionManager.archive(id);
    await refreshChats();
    addToast('Chat archived');
  }, [refreshChats, addToast]);

  const handleRename = useCallback(async (id: string, newTitle: string) => {
    await ChatSessionManager.rename(id, newTitle);
    await refreshChats();
  }, [refreshChats]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsBulkMode(false);
  }, []);

  const bulkArchive = useCallback(async () => {
    for (const id of selectedIds) {
      await ChatSessionManager.archive(id);
    }
    setSelectedIds(new Set());
    setIsBulkMode(false);
    await refreshChats();
    addToast(`${selectedIds.size} chats archived`);
  }, [selectedIds, refreshChats, addToast]);

  const bulkDelete = useCallback(async () => {
    if (window.confirm(`Delete ${selectedIds.size} chats permanently?`)) {
      for (const id of selectedIds) {
        await ChatSessionManager.delete(id);
      }
      setSelectedIds(new Set());
      setIsBulkMode(false);
      await refreshChats();
      addToast(`${selectedIds.size} chats deleted`);
    }
  }, [selectedIds, refreshChats, addToast]);

  const bulkExport = useCallback(async () => {
    const data = chats.filter((c) => selectedIds.has(c.id));
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chats-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`${selectedIds.size} chats exported`);
  }, [selectedIds, chats, addToast]);

  const stats = useMemo(() => ({
    total: chats.length,
    active: activeCount,
    archived: archivedCount,
    pinned: pinnedCount,
    totalMessages: chats.reduce((sum) => sum, 0),
  }), [chats, activeCount, archivedCount, pinnedCount]);

  if (viewMode === 'dashboard') {
    return (
      <div className="flex-1 bg-background overflow-y-auto thin-scrollbar">
        <div className="mx-auto px-6 py-12" style={{ maxWidth: 'min(900px, 100%)' }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-semibold text-foreground tracking-tight">Chats Dashboard</h1>
              <p className="text-muted-foreground mt-1">Overview of your conversations</p>
            </div>
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm text-foreground transition-colors"
            >
              <HugeiconRenderer icon={ListViewIcon} size={18} />
              <span>List View</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Chats</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <HugeiconRenderer icon={SparklesIcon} size={24} className="text-blue-500" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.active}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <HugeiconRenderer icon={CheckIcon} size={24} className="text-green-500" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pinned</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.pinned}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <HugeiconRenderer icon={StarIcon} size={24} className="text-yellow-500 fill-current" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Messages</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.totalMessages.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <HugeiconRenderer icon={SparklesIcon} size={24} className="text-purple-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-0.5">
            {filteredChats.length > 0 ? (
              filteredChats.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                  onRename={handleRename}
                />
              ))
            ) : (
              <ChatsEmptyState searchQuery={searchQuery} filter={filter} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background overflow-y-auto thin-scrollbar">
      <div className="mx-auto px-6 py-12" style={{ maxWidth: 'min(900px, 100%)' }}>
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">Chats</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('dashboard')}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                title="Dashboard View"
              >
                <HugeiconRenderer icon={DashboardSquare01Icon} size={20} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <ChatSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filter={filter}
              onFilterChange={(f) => setFilter(f)}
            />

            <div className="flex items-center gap-2 ml-auto">
              <Dropdown
                isOpen={false}
                onClose={() => {}}
                width="160px"
                className="relative"
              >
                <button
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors border border-border/50"
                  aria-label="Sort chats"
                >
                  <HugeiconRenderer icon={FilterIcon} size={16} />
                </button>
              </Dropdown>

              <button
                onClick={() => setIsBulkMode(!isBulkMode)}
                className={cn(
                  'p-2 rounded-lg transition-colors border',
                  isBulkMode
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground border-border/50'
                )}
                title="Select multiple"
              >
                <HugeiconRenderer icon={isBulkMode ? CheckIcon : SquareIcon} size={18} />
              </button>
            </div>
          </div>
        </div>

        {isBulkMode && selectedIds.size > 0 && (
          <div className="mb-6 p-4 bg-accent/5 border border-accent/20 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium text-accent-foreground">
                {selectedIds.size} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={bulkArchive}
                className="px-3 py-1.5 text-xs font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors border border-border/50 flex items-center gap-1.5"
              >
                <HugeiconRenderer icon={ArchiveIcon} size={14} />
                Archive
              </button>
              <button
                onClick={bulkDelete}
                className="px-3 py-1.5 text-xs font-medium text-destructive bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20 flex items-center gap-1.5"
              >
                <HugeiconRenderer icon={Delete02Icon} size={14} />
                Delete
              </button>
              <button
                onClick={bulkExport}
                className="px-3 py-1.5 text-xs font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors border border-border/50 flex items-center gap-1.5"
              >
                <HugeiconRenderer icon={Download01Icon} size={14} />
                Export
              </button>
            </div>
          </div>
        )}

        <div className="space-y-0.5 overflow-visible">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                onDelete={handleDelete}
                onArchive={handleArchive}
                onRename={handleRename}
                isSelected={selectedIds.has(chat.id)}
                onToggleSelect={toggleSelect}
                isBulkMode={isBulkMode}
              />
            ))
          ) : (
            <ChatsEmptyState searchQuery={searchQuery} filter={filter} />
          )}
        </div>
      </div>
    </div>
  );
};