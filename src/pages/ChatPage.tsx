import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import ChatInput from '../components/chat/ChatInput';
import { getChatStream } from '../services/aiService';
import { ChatSessionManager } from '../services/ChatSessionManager';

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

const AssistantBubble = React.memo(({ content, isStreaming }: { content: string, isStreaming: boolean }) => {
  return (
    <div className="mb-4">
      <div className="text-sm py-4 max-w-[70%] whitespace-pre-wrap">
        {content}
      </div>
      {!isStreaming && (
        <div className="flex gap-2 text-gray-400 items-center">
          <CopyButton content={content} alwaysVisible={true} />
          <button className="hover:text-gray-900 transition-colors"><ThumbsUp size={14} /></button>
          <button className="hover:text-gray-900 transition-colors"><ThumbsDown size={14} /></button>
          <button className="hover:text-gray-900 transition-colors"><RotateCcw size={14} /></button>
        </div>
      )}
    </div>
  );
});

export const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const { uuid } = useParams();
  
  // Persist message count for this chat session
  const [messageCount, setMessageCount] = useState(() => {
    const saved = localStorage.getItem(`message-count-${uuid}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    setMessages([]);
    setMessageCount(0);
  }, [uuid]);

  useEffect(() => {
    localStorage.setItem(`message-count-${uuid}`, messageCount.toString());
  }, [messageCount, uuid]);

  const handleSend = useCallback(async (content: string) => {
    let currentUuid = uuid;
    if (currentUuid === 'new') {
      const newSession = ChatSessionManager.create(content.slice(0, 30) + '...');
      currentUuid = newSession.id;
      // In a real app, we would navigate to the new chat URL here
    }

    const newMessages: Message[] = [...messages, { role: 'user', content }];
    setMessages(newMessages);

    const apiKey = localStorage.getItem('api-key');
    
    // Model rotation logic
    const models = [
      'gemma-4-31b', 
      'gemma-4-26b', 
      'gemini-3.1-flash-lite', 
      'Gemini 3.5 Flash', 
      'Gemini 2.5 Flash'
    ];
    const currentModel = models[messageCount % models.length];
    setMessageCount((prev) => prev + 1);

    if (!apiKey) {
      alert('Please set your Google API Key in settings.');
      return;
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    setIsStreaming(true);

    try {
      const stream = await getChatStream(newMessages, apiKey, currentModel);
      
      for await (const chunk of stream) {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx].content += chunk;
          return updated;
        });
      }
    } catch (error) {
      console.error('Error fetching chat stream:', error);
      setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: `Error: Failed to stream response using ${currentModel}.` }]);
    } finally {
      setIsStreaming(false);
    }
  }, [messages, messageCount, uuid]);

  return (
    <div className="flex flex-col h-screen">
      <div className={`flex-1 overflow-y-auto p-4 ${messages.length === 0 ? 'flex flex-col items-center justify-center' : ''}`}>
        {messages.length > 0 && <div className="h-[20px] bg-white w-full shrink-0" />}
        <div className="max-w-[720px] w-full mx-auto">
          {messages.map((m, i) => (
            m.role === 'user' ? <UserBubble key={i} content={m.content} /> : <AssistantBubble key={i} content={m.content} isStreaming={isStreaming && i === messages.length - 1} />
          ))}
          {messages.length === 0 && (
            <div className="w-full mt-4 flex flex-col items-center">
              <h1 className="text-[48px] font-serif-source mb-[10px] text-neutral-800">Hello, how can I help?</h1>
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
