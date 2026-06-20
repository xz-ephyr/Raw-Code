import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArchiveIcon, Delete02Icon, PencilEdit02Icon, MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { cn } from '../../lib/utils';
import { HugeiconRenderer } from '../common/HugeiconRenderer';
export const ChatListItem = ({ chat, onDelete, onArchive, onRename }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: any) => { if (menuRef.current && !menuRef.current.contains(e.target)) setIsMenuOpen(false); };
    if (isMenuOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isMenuOpen]);
  const chatLink = chat.projectId ? `/project/session/${chat.id}` : `/thread/${chat.id}`;
  return (
    <div className={cn('group relative w-full rounded-[12px] transition-all duration-200 hover:bg-[#f5f5f5] active:bg-[#eeeeee] flex items-center gap-4 px-4 py-3 h-[60px]', isMenuOpen ? 'z-20' : 'z-0 hover:z-10')}>
      <Link to={chatLink} className="flex-1 min-w-0 h-full flex items-center">
        <div className="w-full">
          {isEditing ? (
            <form onSubmit={(e) => { e.preventDefault(); onRename(chat.id, editTitle); setIsEditing(false); }} onClick={e => e.stopPropagation()}>
              <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)} onBlur={() => setIsEditing(false)} className="w-full bg-white border border-neutral-300 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black" />
            </form>
          ) : (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-neutral-900 truncate">{chat.title}</span>
              {chat.lastMessage && <span className="text-xs text-neutral-500 truncate mt-0.5">{chat.lastMessage}</span>}
            </div>
          )}
        </div>
      </Link>
      <div className="shrink-0 relative" ref={menuRef}>
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className={cn('p-1.5 hover:bg-neutral-200 rounded-md text-neutral-500 transition-all opacity-0 group-hover:opacity-100', isMenuOpen && 'opacity-100 bg-neutral-200')}>
          <HugeiconRenderer icon={MoreVerticalIcon} size={18} />
        </button>
        {isMenuOpen && (
          <div className="absolute right-0 mt-1 w-40 bg-white border border-neutral-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in duration-100 origin-top-right">
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
              <HugeiconRenderer icon={PencilEdit02Icon} size={16} className="text-neutral-400" /><span>Rename</span>
            </button>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(chat.id); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
              <HugeiconRenderer icon={ArchiveIcon} size={16} className="text-neutral-400" /><span>{chat.archived ? 'Unarchive' : 'Archive'}</span>
            </button>
            <div className="h-px bg-neutral-100 my-1.5" />
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (confirm('Are you sure?')) onDelete(chat.id); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <HugeiconRenderer icon={Delete02Icon} size={16} className="text-red-400" /><span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
