import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search01Icon,
  ArchiveIcon,
  Delete02Icon,
  PencilEdit02Icon,
  Folder01Icon,
  MoreVerticalIcon,
  FilterMailIcon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { ChatSession } from '../types/chat';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { HugeiconRenderer } from '../components/ui/HugeiconRenderer';

const ChatListItem = React.memo(({
  chat,
  onDelete,
  onArchive,
  onRename,
}: {
  chat: ChatSession;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirmAsync } = useToast();

  const closeMenu = () => {
    setIsMenuOpen(false);
    setMenuPos(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMenuOpen]);

  const handleRename = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
    closeMenu();
  };

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    onRename(chat.id, editTitle);
    setIsEditing(false);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onArchive(chat.id);
    closeMenu();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (await confirmAsync('Are you sure you want to delete this chat?')) {
      onDelete(chat.id);
    }
    closeMenu();
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
    setIsMenuOpen(!isMenuOpen);
  };

  const chatLink = chat.projectId ? `/project/session/${chat.id}` : `/thread/${chat.id}`;

  return (
    <div
      className={cn(
        'group relative w-full rounded-[6px] transition-all duration-200',
        'hover:bg-[#f5f5f5] active:bg-[#eeeeee]',
        'flex items-center gap-3 px-3 py-1.5',
        isMenuOpen ? 'z-20' : 'z-0 hover:z-10'
      )}
    >
      <Link to={chatLink} className="flex-1 min-w-0 h-full flex items-center">
        <div className="w-full">
          {isEditing ? (
            <form onSubmit={submitRename} onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => setIsEditing(false)}
                className="w-full bg-white border border-neutral-300 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
              />
            </form>
          ) : (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-neutral-900 truncate">{chat.title}</span>
              {chat.lastMessage && (
                <span className="text-xs text-neutral-500 truncate mt-0.5">{chat.lastMessage}</span>
              )}
            </div>
          )}
        </div>
      </Link>

      <div className="shrink-0" ref={menuRef}>
        <button
          onClick={toggleMenu}
          className={cn(
            'p-1.5 hover:bg-neutral-200 rounded-md text-neutral-500 transition-all opacity-0 group-hover:opacity-100',
            isMenuOpen && 'opacity-100 bg-neutral-200'
          )}
          aria-label="Chat actions"
        >
          <HugeiconRenderer icon={MoreVerticalIcon} size={18} />
        </button>

        {isMenuOpen && menuPos && (
          <div
            className="fixed w-40 bg-white border border-neutral-200 rounded-xl shadow-xl py-1.5 z-[9999]"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              onClick={handleRename}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <HugeiconRenderer icon={PencilEdit02Icon} size={16} className="text-neutral-400" />
              <span>Rename</span>
            </button>
            <button
              onClick={handleArchive}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <HugeiconRenderer icon={ArchiveIcon} size={16} className="text-neutral-400" />
              <span>{chat.archived ? 'Unarchive' : 'Archive'}</span>
            </button>
            <div className="h-px bg-neutral-100 my-1.5" />
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <HugeiconRenderer icon={Delete02Icon} size={16} className="text-red-400" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export const ChatsPage = () => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'active' | 'archived'>('active');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterMenuPos, setFilterMenuPos] = useState<{ top: number; left: number } | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const refreshChats = useCallback(async () => {
    const allChats = await ChatSessionManager.getAll();
    setChats(allChats);
  }, []);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
        setFilterMenuPos(null);
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
    <div className="flex-1 bg-white overflow-y-auto thin-scrollbar">
      <div className="mx-auto px-6 py-12" style={{ maxWidth: 'min(800px, 100%)' }}>
        {/* Header */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">Chats</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                <HugeiconRenderer icon={Search01Icon} size={20} />
              </div>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-50 rounded-[8px] py-3 pl-12 pr-4 text-sm placeholder:text-neutral-400"
              />
            </div>

            <div ref={filterRef}>
              <button
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setFilterMenuPos({ top: rect.bottom + 8, left: rect.right - 208 });
                  setIsFilterOpen(!isFilterOpen);
                }}
                className={cn(
                  'p-3 rounded-2xl transition-all flex items-center justify-center h-[46px] w-[46px] bg-transparent text-neutral-600 active:scale-95 active:bg-neutral-100',
                  isFilterOpen && 'bg-neutral-100 text-neutral-900'
                )}
                aria-label="Filter chats"
              >
                <HugeiconRenderer icon={FilterMailIcon} size={20} />
              </button>

              {isFilterOpen && filterMenuPos && (
                <div
                  className="fixed w-52 bg-white border border-neutral-200 rounded-2xl shadow-xl py-2 z-[9999]"
                  style={{ top: filterMenuPos.top, left: filterMenuPos.left }}
                >
                  <div className="px-4 py-2 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                    Filter by
                  </div>
                  <button
                    onClick={() => {
                      setFilter('active');
                      setIsFilterOpen(false);
                      setFilterMenuPos(null);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
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
                      setFilterMenuPos(null);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
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

        {/* List Section */}
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
