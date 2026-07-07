import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArchiveIcon,
  Delete02Icon,
  PencilEdit02Icon,
  MoreVerticalIcon,
} from '@hugeicons/core-free-icons';
import { ChatSession } from '@/types/chat';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useToast } from '../ui/Toast';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';

interface ChatListItemProps {
  chat: ChatSession;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

export function ChatListItem({ chat, onDelete, onArchive, onRename }: ChatListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [time, setTime] = useState(Date.now());
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirmAsync } = useToast();

  useEffect(() => {
    const id = setInterval(() => setTime(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

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
        'hover:bg-muted active:bg-muted',
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
                className="w-full bg-card border border-border rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </form>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground line-clamp-2">{chat.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(chat.createdAt, time)}</span>
              </div>
              {chat.lastMessage && (
                <span className="text-xs text-muted-foreground truncate mt-0.5">{chat.lastMessage.length > 100 ? chat.lastMessage.slice(0, 100) + '…' : chat.lastMessage}</span>
              )}
            </div>
          )}
        </div>
      </Link>

      <div className="shrink-0" ref={menuRef}>
        <button
          onClick={toggleMenu}
          className={cn(
            'p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-all opacity-0 group-hover:opacity-100',
            isMenuOpen && 'opacity-100 bg-muted'
          )}
          aria-label="Chat actions"
        >
          <HugeiconRenderer icon={MoreVerticalIcon} size={18} />
        </button>

        {isMenuOpen && menuPos && (
          <div
            className="fixed w-40 bg-card border border-border rounded-xl shadow-xl shadow-black/30 py-1.5 z-[9999]"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              onClick={handleRename}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <HugeiconRenderer icon={PencilEdit02Icon} size={16} className="text-muted-foreground" />
              <span>Rename</span>
            </button>
            <button
              onClick={handleArchive}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <HugeiconRenderer icon={ArchiveIcon} size={16} className="text-muted-foreground" />
              <span>{chat.archived ? 'Unarchive' : 'Archive'}</span>
            </button>
            <div className="h-px bg-border my-1.5" />
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-900/30 transition-colors"
            >
              <HugeiconRenderer icon={Delete02Icon} size={16} className="text-destructive" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
