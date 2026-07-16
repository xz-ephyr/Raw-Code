import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useChatsStore } from '@/stores/chatsStore';

const ChatsList = React.memo(function ChatsList({ collapsed }: { collapsed: boolean }) {
  const chats = useChatsStore((s) => s.chats);
  const refresh = useChatsStore((s) => s.refresh);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (collapsed) return null;

  return (
    <div className="mt-2 space-y-1">
      {chats.map((chat) => (
        <Link
          key={chat.id}
          to={`/thread/${chat.id}`}
          className="block px-4 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent rounded-[6px] truncate"
        >
          {chat.title}
        </Link>
      ))}
    </div>
  );
});

export default ChatsList;
