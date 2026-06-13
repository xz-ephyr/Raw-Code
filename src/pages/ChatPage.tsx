import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Copy01Icon, CheckmarkBadge01Icon, ThumbsUpIcon, ThumbsDownIcon, ArrowTurnBackwardIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import ChatInput from '../components/chat/ChatInput';
import { getChatStream } from '../services/aiService';
import { ChatSessionManager } from '../services/ChatSessionManager';

const HugeiconRenderer = ({ icon: Icon, size = 14, className }: { icon: any, size?: number, className?: string }) => (
  <HugeiconsIcon icon={Icon} size={size} color="currentColor" strokeWidth={1.5} className={className} />
);

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
      className={`${alwaysVisible ? '' : 'opacity-0 group-hover:opacity-100'} p-1 mt-1 text-gray-600 hover:text-black transition-opacity`}
    >
      {copied ? <HugeiconRenderer icon={CheckmarkBadge01Icon} size={18} className="text-green-600" /> : <HugeiconRenderer icon={Copy01Icon} size={18} />}
    </button>
  );
};

const UserBubble = React.memo(({ content }: { content: string }) => (
  <div className="flex flex-col items-end mb-6 group">
    <div className="bg-[#f9f9f9] rounded-[8px] px-4 py-2.5 text-sm max-w-[70%]">
      {content}
    </div>
    <CopyButton content={content} alwaysVisible={false} />
  </div>
));

const AssistantBubble = React.memo(({ content, isStreaming }: { content: string, isStreaming: boolean }) => {
  return (
    <div className="mb-6">
      <div className="text-sm py-4 max-w-full whitespace-pre-wrap">
        {content}
      </div>
      {!isStreaming && (
        <div className="flex gap-3 text-gray-600 items-center">
          <CopyButton content={content} alwaysVisible={true} />
          <button className="hover:text-black transition-colors"><HugeiconRenderer icon={ThumbsUpIcon} size={18} /></button>
          <button className="hover:text-black transition-colors"><HugeiconRenderer icon={ThumbsDownIcon} size={18} /></button>
          <button className="hover:text-black transition-colors"><HugeiconRenderer icon={ArrowTurnBackwardIcon} size={18} /></button>
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
    }

    setMessages((prev) => [...prev, { role: 'user', content }]);

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
      const stream = await getChatStream([...messages, { role: 'user', content }], apiKey, currentModel);
      
      let accumulatedContent = '';
      const startTime = Date.now();
      let firstTokenReceived = false;

      for await (const chunk of stream) {
        if (!firstTokenReceived) {
          console.log(`First token received in ${Date.now() - startTime}ms`);
          firstTokenReceived = true;
        }
        accumulatedContent += chunk;
        
        // Update state on every chunk for responsive UI
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx].content = accumulatedContent;
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
              <h1 className="text-[43px] font-serif-source mb-[10px] text-neutral-800">Hello, how can I help?</h1>
              <ChatInput onSend={handleSend} isLoading={isStreaming} />
            </div>
          )}
        </div>
      </div>
      {messages.length > 0 && (
        <div className="shrink-0 pb-8 px-4">
          <ChatInput onSend={handleSend} isLoading={isStreaming} />
        </div>
      )}
    </div>
  );
};
