import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search01Icon,
  Folder01Icon,
  FilterIcon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { ChatSession } from '../types/chat';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { cn } from '../lib/utils';
import { HugeiconRenderer } from '../components/common/HugeiconRenderer';
import { ChatListItem } from '../components/chat/ChatListItem';

export const ChatsPage = () => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'active' | 'archived'>('active');
  const [sessionType, setSessionType] = useState<'normal' | 'project'>('normal');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const refreshChats = async () => {
    const all = await ChatSessionManager.getAll(sessionType === 'normal' ? null : undefined);
    setChats(all.filter(s => sessionType === 'normal' ? !s.projectId : !!s.projectId));
  };

  useEffect(() => {
    refreshChats();
  }, [sessionType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen]);

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

  const handleDelete = async (id: string) => {
    await ChatSessionManager.delete(id);
    await refreshChats();
  };

  const handleArchive = async (id: string) => {
    await ChatSessionManager.archive(id);
    await refreshChats();
  };

  const handleRename = async (id: string, newTitle: string) => {
    await ChatSessionManager.rename(id, newTitle);
    await refreshChats();
  };

  return (
    <div className="flex-1 bg-white overflow-y-auto thin-scrollbar">
      <div className="mx-auto px-6 py-12" style={{ maxWidth: 'min(800px, 100%)' }}>
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">Chats</h1>
          </div>

          <div className="flex p-1 bg-neutral-100 rounded-[6px] w-fit">
            <button
              onClick={() => setSessionType('normal')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-[6px] transition-all',
                sessionType === 'normal'
                  ? 'bg-neutral-50 text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              )}
            >
              Normal Threads
            </button>
            <button
              onClick={() => setSessionType('project')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-[6px] transition-all',
                sessionType === 'project'
                  ? 'bg-neutral-50 text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              )}
            >
              Project Sessions
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-neutral-900 transition-colors">
                <HugeiconRenderer icon={Search01Icon} size={20} />
              </div>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-300 transition-all placeholder:text-neutral-400"
              />
            </div>

            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={cn(
                  'p-3 rounded-2xl transition-all flex items-center justify-center h-[46px] w-[46px] bg-transparent text-neutral-600 active:scale-95 active:bg-neutral-100',
                  isFilterOpen && 'bg-neutral-100 text-neutral-900'
                )}
                aria-label="Filter chats"
              >
                <HugeiconRenderer icon={FilterIcon} size={20} />
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-neutral-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                  <div className="px-4 py-2 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                    Filter by
                  </div>
                  <button
                    onClick={() => {
                      setFilter('active');
                      setIsFilterOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors group/item"
                  >
                    <span
                      className={cn(
                        'font-medium',
                        filter === 'active' ? 'text-neutral-900' : 'text-neutral-600'
                      )}
                    >
                      Active Chats
                    </span>
                    {filter === 'active' && (
                      <HugeiconRenderer
                        icon={CheckmarkCircle02Icon}
                        size={18}
                        className="text-neutral-900"
                      />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setFilter('archived');
                      setIsFilterOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors group/item"
                  >
                    <span
                      className={cn(
                        'font-medium',
                        filter === 'archived' ? 'text-neutral-900' : 'text-neutral-600'
                      )}
                    >
                      Archived Chats
                    </span>
                    {filter === 'archived' && (
                      <HugeiconRenderer
                        icon={CheckmarkCircle02Icon}
                        size={18}
                        className="text-neutral-900"
                      />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
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
            <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-200 mb-6 border border-neutral-100 shadow-sm">
                <HugeiconRenderer icon={searchQuery ? Search01Icon : Folder01Icon} size={36} />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                {searchQuery
                  ? 'No matches found'
                  : filter === 'archived'
                    ? 'No archived conversations'
                    : 'Your chat list is empty'}
              </h3>
              <p className="text-sm text-neutral-500 max-w-[320px] leading-relaxed">
                {searchQuery
                  ? `We couldn't find any results for "${searchQuery}". Try a different search term.`
                  : 'Every conversation you start will appear here for easy access and organization.'}
              </p>
              {!searchQuery && filter === 'active' && (
                <Link
                  to="/thread/new"
                  className="mt-8 px-6 py-2.5 bg-neutral-900 text-white text-sm font-semibold rounded-full hover:bg-neutral-800 transition-all hover:shadow-lg active:scale-95"
                >
                  Start a new thread
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
