import { useState, useEffect } from 'react';
import { Copy } from 'lucide-react';
import ChatInput from '../components/chat/ChatInput';

type Message = { role: 'user' | 'assistant'; content: string };

const CopyButton = ({ content }: { content: string }) => (
  <button 
    onClick={() => navigator.clipboard.writeText(content).catch(err => console.error('Failed to copy!', err))}
    className="p-1 mt-1 text-gray-400 hover:text-gray-900 transition-opacity"
  >
    <Copy size={14} />
  </button>
);

const UserBubble = ({ content }: { content: string }) => (
  <div className="flex flex-col items-end mb-4 group mt-6">
    <div className="bg-[#f9f9f9] rounded-[8px] px-4 py-2.5 text-sm max-w-[70%]">
      {content}
    </div>
    <CopyButton content={content} />
  </div>
);

const AssistantBubble = ({ content }: { content: string }) => {
  const [displayedContent, setDisplayedContent] = useState('');

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedContent(content.slice(0, i + 1));
      i++;
      if (i >= content.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [content]);

  return (
    <div className="mb-4">
      <div className="text-sm py-4">
        {displayedContent}
      </div>
      <CopyButton content={content} />
    </div>
  );
};

export const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = (content: string) => {
    setMessages((prev) => [...prev, { role: 'user', content }, { role: 'assistant', content: 'This is a simulated AI response.' }]);
  };

  return (
    <div className="flex flex-col h-screen">
      {messages.length > 0 && <div className="h-[20px] bg-white w-full shrink-0" />}
      <div className={`flex-1 overflow-y-auto p-4 ${messages.length === 0 ? 'flex items-center justify-center -mt-20' : ''}`}>
        <div className="max-w-[720px] mx-auto">
          {messages.map((m, i) => (
            m.role === 'user' ? <UserBubble key={i} content={m.content} /> : <AssistantBubble key={i} content={m.content} />
          ))}
        </div>
      </div>
      <div className="shrink-0">
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
};
