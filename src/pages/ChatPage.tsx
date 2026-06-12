import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import ChatInput from '../components/chat/ChatInput';

type Message = { role: 'user' | 'assistant'; content: string };

const CopyButton = ({ content, alwaysVisible }: { content: string; alwaysVisible: boolean }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button 
      onClick={handleCopy}
      className={`${alwaysVisible ? '' : 'opacity-0 group-hover:opacity-100'} p-1 mt-1 text-gray-400 hover:text-gray-900 transition-opacity`}
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  );
};

const UserBubble = React.memo(({ content }: { content: string }) => (
  <div className="flex flex-col items-end mb-4 group mt-6">
    <div className="bg-[#f9f9f9] rounded-[8px] px-4 py-2.5 text-sm max-w-[70%]">
      {content}
    </div>
    <CopyButton content={content} alwaysVisible={false} />
  </div>
));

const AssistantBubble = React.memo(({ content }: { content: string }) => {
  return (
    <div className="mb-4">
      <div className="text-sm py-4 max-w-[70%]">
        {content}
      </div>
      <div className="flex gap-2 text-gray-400 items-center">
        <CopyButton content={content} alwaysVisible={true} />
        <button className="hover:text-gray-900 transition-colors"><ThumbsUp size={14} /></button>
        <button className="hover:text-gray-900 transition-colors"><ThumbsDown size={14} /></button>
        <button className="hover:text-gray-900 transition-colors"><RotateCcw size={14} /></button>
      </div>
    </div>
  );
});

export const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const { uuid } = useParams();

  useEffect(() => {
    setMessages([]);
  }, [uuid]);

  const handleSend = useCallback((content: string) => {
    // Add user message first (Request First logic)
    setMessages((prev) => [...prev, { role: 'user', content }]);

    // Simulate streaming from "backend"
    let fullContent = 'This is a simulated AI response.';
    let currentContent = '';

    // Initial assistant message entry (empty content)
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      let i = 0;
      const interval = setInterval(() => {
        currentContent += fullContent[i];
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = currentContent;
          }
          return [...newMessages];
        });
        i++;
        if (i >= fullContent.length) clearInterval(interval);
      }, 30);
    }, 100);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div className={`flex-1 overflow-y-auto p-4 ${messages.length === 0 ? 'flex flex-col items-center justify-center' : ''}`}>
        {messages.length > 0 && <div className="h-[20px] bg-white w-full shrink-0" />}
        <div className="max-w-[720px] w-full mx-auto">
          {messages.map((m, i) => (
            m.role === 'user' ? <UserBubble key={i} content={m.content} /> : <AssistantBubble key={i} content={m.content} />
          ))}
          {messages.length === 0 && (
            <div className="w-full mt-4">
              <ChatInput onSend={handleSend} />
            </div>
          )}
        </div>
      </div>
      {messages.length > 0 && (
        <div className="shrink-0">
          <ChatInput onSend={handleSend} />
        </div>
      )}
    </div>
  );
};
