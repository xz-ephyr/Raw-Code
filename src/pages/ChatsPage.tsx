import { useState, useEffect, useMemo, useRef } from 'react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { ChatSession } from '../types/chat';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { cn } from '../lib/utils';
import { HugeiconRenderer } from '../components/common/HugeiconRenderer';
import { ChatListItem } from '../components/chat/ChatListItem';
export const ChatsPage = () => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter] = useState<'active' | 'archived'>('active');
  const [sessionType, setSessionType] = useState<'normal' | 'project'>('normal');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const lastRequestId = useRef(0);
  const refreshChats = async () => {
    const rid = ++lastRequestId.current;
    const all = await ChatSessionManager.getAll(sessionType === 'normal' ? null : undefined);
    if (rid === lastRequestId.current) setChats(all.filter(s => sessionType === 'normal' ? !s.projectId : !!s.projectId));
  };
  useEffect(() => { refreshChats(); }, [sessionType]);
  useEffect(() => {
    const h = (e: any) => { if (filterRef.current && !filterRef.current.contains(e.target)) setIsFilterOpen(false); };
    if (isFilterOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isFilterOpen]);
  const filteredChats = useMemo(() => chats.filter(c => {
    const m = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
    return (filter === 'archived' ? c.archived : !c.archived) && m;
  }).sort((a, b) => b.createdAt - a.createdAt), [chats, searchQuery, filter]);
  return (
    <div className="flex-1 bg-white overflow-y-auto thin-scrollbar">
      <div className="mx-auto px-6 py-12" style={{ maxWidth: 'min(800px, 100%)' }}>
        <div className="flex flex-col gap-6 mb-8">
          <h1 className="text-3xl font-semibold">Chats</h1>
          <div className="flex p-1 bg-neutral-100 rounded-[6px] w-fit">
            <button onClick={() => setSessionType('normal')} className={cn('px-4 py-1.5 text-sm font-medium rounded-[6px]', sessionType === 'normal' ? 'bg-neutral-50 shadow-sm' : 'text-neutral-50')}>Normal Threads</button>
            <button onClick={() => setSessionType('project')} className={cn('px-4 py-1.5 text-sm font-medium rounded-[6px]', sessionType === 'project' ? 'bg-neutral-50 shadow-sm' : 'text-neutral-50')}>Project Sessions</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"><HugeiconRenderer icon={Search01Icon} size={20} /></div>
              <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 pl-12 pr-4 text-sm" />
            </div>
          </div>
        </div>
        <div className="space-y-0.5">
          {filteredChats.map(c => <ChatListItem key={c.id} chat={c} onDelete={async (id: any) => { await ChatSessionManager.delete(id); refreshChats(); }} onArchive={async (id: any) => { await ChatSessionManager.archive(id); refreshChats(); }} onRename={async (id: any, t: any) => { await ChatSessionManager.rename(id, t); refreshChats(); }} />)}
        </div>
      </div>
    </div>
  );
};
