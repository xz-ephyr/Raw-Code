import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChatSession } from '../types/chat';
import { ChatSessionManager } from '@/services/ChatSessionManager';
import { ChatListItem } from '../components/chat/ChatListItem';
import { ChatSearchBar } from '../components/chat/ChatSearchBar';
import { ChatsEmptyState } from '../components/chat/ChatsEmptyState';

export const ChatsPage = () => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'active' | 'archived'>('active');

  const refreshChats = useCallback(async () => {
    const allChats = await ChatSessionManager.getAll();
    setChats(allChats);
  }, []);

  useEffect(() => {
    ChatSessionManager.getAll().then(allChats => {
      setChats(allChats);
    });
  }, []);

  const filteredChats = useMemo(() => {
    return chats
      .filter((chat) => {
        const matchesSearch =
          chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());

        if (filter === 'archived') return chat.archived && matchesSearch;
        return !chat.archived && matchesSearch;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [chats, searchQuery, filter]);

  const handleDelete = useCallback(async (id: string) => {
    await ChatSessionManager.delete(id);
    await refreshChats();
  }, [refreshChats]);

  const handleArchive = useCallback(async (id: string) => {
    await ChatSessionManager.archive(id);
    await refreshChats();
  }, [refreshChats]);

  const handleRename = useCallback(async (id: string, newTitle: string) => {
    await ChatSessionManager.rename(id, newTitle);
    await refreshChats();
  }, [refreshChats]);

  return (
    <div className="flex-1 bg-[#1a1a1a] overflow-y-auto thin-scrollbar">
      <div className="mx-auto px-6 py-12" style={{ maxWidth: 'min(800px, 100%)' }}>
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-neutral-100 tracking-tight">Chats</h1>
          </div>
          <ChatSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>

        <div className="space-y-0.5 overflow-visible">
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
};
