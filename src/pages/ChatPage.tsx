import React, { useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useChat } from '@ai-sdk/react';
import ChatInput from '../components/chat/ChatInput';
import { UserBubble } from '../components/chat/UserBubble';
import { AssistantBubble } from '../components/chat/AssistantBubble';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { getModelForChatRequest } from '../config/models';
import { useArtifacts } from '../hooks/useArtifacts';
import { ArtifactPane } from '../components/artifacts/ArtifactPane';
import { ArtifactPreviewCard } from '../components/artifacts/ArtifactPreviewCard';
import { chatCompletion } from '../services/aiService';

export const ChatPage = () => {
  const { uuid } = useParams();
  const {
    activeArtifactId,
    setActiveArtifactId,
    setViewingVersion,
    isOpen: isArtifactOpen,
    setIsOpen: setIsArtifactOpen,
    addOrUpdateArtifact,
    getArtifactVersions,
    getActiveArtifact,
    closeArtifact
  } = useArtifacts();

  const currentModel = getModelForChatRequest(uuid);
  const apiKey = localStorage.getItem('api-key');

  const { messages, append, isLoading, setMessages } = useChat({
    // @ts-ignore
    fetch: async (url: any, options: any) => {
        const body = JSON.parse(options?.body as string);
        const result = await chatCompletion({
            messages: body.messages,
            apiKey: body.apiKey,
            modelName: body.model
        });
        return result.toTextStreamResponse();
    },
    initialMessages: [],
    body: {
      model: currentModel,
      apiKey: apiKey,
    },
    onFinish: (message) => {
      // @ts-ignore
      if (message.toolInvocations) {
        // @ts-ignore
        message.toolInvocations.forEach((toolInvocation) => {
          if (toolInvocation.toolName === 'create_artifact' && toolInvocation.state === 'result') {
            const { type, title, content } = toolInvocation.args;
            addOrUpdateArtifact(type, title, content);
          }
        });
      }
    },
  }) as any;

  useEffect(() => {
    setMessages([]);
  }, [uuid, setMessages]);

  const handleSend = useCallback(async (content: string) => {
    if (!apiKey) {
      alert('Please set your Google API Key in settings.');
      return;
    }

    let currentUuid = uuid;
    if (currentUuid === 'new') {
      ChatSessionManager.create(content.slice(0, 30) + '...');
    }

    append({
      role: 'user',
      content,
    });
  }, [uuid, apiKey, append]);

  const activeArtifact = getActiveArtifact();
  const activeArtifactVersions = activeArtifactId ? getArtifactVersions(activeArtifactId) : [];

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.toolInvocations) {
      const artifactTool = lastMessage.toolInvocations.find((ti: any) => ti.toolName === 'create_artifact');
      if (artifactTool?.state === 'result') {
         const id = artifactTool.args.title.toLowerCase().replace(/\s+/g, '-');
         setActiveArtifactId(id);
         setIsArtifactOpen(true);
      }
    }
  }, [messages, setActiveArtifactId, setIsArtifactOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div className={`flex flex-col flex-1 min-w-0 bg-white transition-all duration-300 relative`}>
        <div className={`flex-1 overflow-y-auto ${messages.length === 0 ? 'flex flex-col items-center justify-center p-4' : ''}`}>
          {messages.length > 0 && <div className="h-[20px] bg-white w-full shrink-0" />}
          <div className="max-w-[720px] w-full mx-auto px-4">
            {messages.map((m: any, i: number) => (
              <React.Fragment key={m.id || i}>
                {m.role === 'user' ? (
                  <UserBubble content={m.content} />
                ) : (
                  <>
                    <AssistantBubble
                      content={m.content}
                      model={currentModel}
                      isStreaming={isLoading && i === messages.length - 1}
                      toolInvocations={m.toolInvocations}
                    />
                    {m.toolInvocations?.map((ti: any, idx: number) => {
                      if (ti.toolName === 'create_artifact' && ti.state === 'result') {
                        return (
                          <ArtifactPreviewCard
                            key={idx}
                            title={ti.args.title}
                            type={ti.args.type}
                            onClick={() => {
                              setActiveArtifactId(ti.args.title.toLowerCase().replace(/\s+/g, '-'));
                              setViewingVersion(null);
                              setIsArtifactOpen(true);
                            }}
                          />
                        );
                      }
                      return null;
                    })}
                  </>
                )}
              </React.Fragment>
            ))}

            {messages.length === 0 && (
              <div className="w-full mt-4 flex flex-col items-center">
                <h1 className="text-[43px] font-serif-source mb-[10px] text-neutral-800 text-center">Hello, how can I help?</h1>
                <ChatInput onSend={handleSend} isLoading={isLoading} />
              </div>
            )}
          </div>
        </div>

        {messages.length > 0 && (
          <div className="shrink-0 pb-8 w-full max-w-[720px] mx-auto px-4 bg-white">
            <ChatInput onSend={handleSend} isLoading={isLoading} />
          </div>
        )}
      </div>

      {isArtifactOpen && (
        <ArtifactPane
          isOpen={isArtifactOpen}
          onClose={closeArtifact}
          artifacts={activeArtifactVersions}
          activeArtifact={activeArtifact}
          onVersionSelect={(a: any) => {
            setViewingVersion(a.version);
          }}
        />
      )}
    </div>
  );
};
