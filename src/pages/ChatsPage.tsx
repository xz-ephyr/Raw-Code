import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { ChatSessionManager } from '@/services/ChatSessionManager';
import { ChatListItem } from '../components/chat/ChatListItem';
import { ChatSearchBar } from '../components/chat/ChatSearchBar';
import { ChatsEmptyState } from '../components/chat/ChatsEmptyState';
import {
  ArchiveIcon,
  Delete02Icon,
  Download01Icon,
  CheckIcon,
  SquareIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '../components/ui/HugeiconRenderer';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { useChatsStore } from '../stores/chatsStore';

type FilterOption = 'active' | 'archived';

export const ChatsPage = () => {
  const chats = useChatsStore((s) => s.chats);
  const refreshChats = useChatsStore((s) => s.refresh);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [filter, setFilter] = useState<FilterOption>('active');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  const activeCount = useMemo(() => chats.filter((c) => !c.archived).length, [chats]);
  const archivedCount = useMemo(() => chats.filter((c) => c.archived).length, [chats]);

  const filteredChats = useMemo(() => {
    const query = deferredQuery;
    let result = chats
      .filter((chat) => {
        const matchesSearch =
          chat.title.toLowerCase().includes(query.toLowerCase()) ||
          chat.lastMessage?.toLowerCase().includes(query.toLowerCase());

        if (filter === 'archived') return chat.archived && matchesSearch;
        return !chat.archived && matchesSearch;
      })
      .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));

    return result;
  }, [chats, searchQuery, filter]);

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

  return (
    <div className="flex-1 bg-background flex flex-col overflow-hidden">
      <div className="shrink-0 w-full px-6 pt-12 pb-4 max-w-[900px] mx-auto">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">Chats</h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <ChatSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filter={filter}
              onFilterChange={(f) => setFilter(f)}
              activeCount={activeCount}
              archivedCount={archivedCount}
            />

            <div className="flex items-center gap-2 ml-auto">
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
                {filter === 'archived' ? 'Unarchive' : 'Archive'}
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
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
        <div className="px-6 pb-12 max-w-[900px] mx-auto">
          <div className="space-y-0.5">
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
    </div>
  );
};