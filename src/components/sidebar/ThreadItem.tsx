import { useState, useEffect, useRef, memo } from 'react';

import {
  PencilEdit02Icon,
  ArchiveIcon,
  Delete02Icon,
  MoreVerticalIcon,
  PinIcon,
  PinOffIcon,
  MailOpenIcon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { useToast } from '../ui/Toast';
import type { ChatSession } from '@/types/chat';

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const date = new Date(timestamp);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getTimeGroup(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  return 'Older';
}

export { getTimeGroup, formatRelativeTime };

const ThreadItem = memo(function ThreadItem({
  session,
  isActive,
  onNavigate,
  onRename,
  onArchive,
  onDelete,
  onTogglePin,
  onMarkRead,
  isStreaming = false,
}: {
  session: ChatSession;
  isActive: boolean;
  onNavigate: () => void;
  onRename: (id: string, title: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTogglePin: (id: string, pinned: boolean) => Promise<void>;
  onMarkRead: (id: string) => Promise<void>;
  isStreaming?: boolean;
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

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin(session.id, !!session.pinned);
    setIsMenuOpen(false);
  };

  const handleNav = () => {
    if (session.unread) {
      onMarkRead(session.id);
    }
    onNavigate();
  };

  const ts = session.updatedAt || session.createdAt;

  return (
    <div
      className={`group relative w-full rounded-[6px] text-sm transition-colors ${
        isActive
          ? 'bg-sidebar-accent text-sidebar-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
      } ${isMenuOpen ? 'z-20' : ''}`}
    >
      <div className="flex items-start px-2 py-1.5 gap-1.5">
        <button
          onClick={handleNav}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-1.5">
            {session.unread && (
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-0.5" />
            )}
            {isStreaming && (
              <span className="shrink-0 text-purple-500 animate-pulse" aria-label="Streaming in background">
                <HugeiconRenderer icon={SparklesIcon} size={12} />
              </span>
            )}
            {session.pinned && (
              <span className="shrink-0 text-muted-foreground">
                <HugeiconRenderer icon={PinIcon} size={12} />
              </span>
            )}
            {isEditing ? (
              <form onSubmit={submitRename} onClick={(e) => e.stopPropagation()} className="flex-1">
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => setIsEditing(false)}
                  className="w-full bg-card border border-border rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </form>
            ) : (
              <span className="truncate block text-sidebar-foreground text-xs font-medium leading-tight">
                {session.title}
              </span>
            )}
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60">
              {formatRelativeTime(ts)}
            </span>
          </div>
        </button>

        {!isEditing && (
          <div ref={menuRef} className="shrink-0 pt-0.5">
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
                  onClick={handlePin}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-sidebar-accent transition-colors"
                >
                  <HugeiconRenderer icon={session.pinned ? PinOffIcon : PinIcon} size={13} className="text-muted-foreground" />
                  <span>{session.pinned ? 'Unpin' : 'Pin'}</span>
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
                  onClick={(e) => {
                    e.stopPropagation();
                    if (session.unread) {
                      onMarkRead(session.id);
                    } else {
                      // Note: markAsUnread is on ChatSessionManager
                      import('@/services/ChatSessionManager').then(m => m.ChatSessionManager.markAsUnread(session.id));
                    }
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-sidebar-accent transition-colors"
                >
                  <HugeiconRenderer icon={MailOpenIcon} size={13} className="text-muted-foreground" />
                  <span>{session.unread ? 'Mark read' : 'Mark unread'}</span>
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
});

export default ThreadItem;
