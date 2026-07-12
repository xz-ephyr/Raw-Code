import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInput from './ChatInput';
import { useChatsStore } from '@/stores/chatsStore';
import { formatRelativeTime } from '../../lib/utils';

const CONTENT_STARTERS = [
  { label: 'Write a blog post', icon: '✍️', prompt: 'Write a blog post about' },
  { label: 'Draft an email', icon: '📧', prompt: 'Draft an email about' },
  { label: 'Brainstorm ideas', icon: '💡', prompt: 'Brainstorm ideas for' },
  { label: 'Summarize content', icon: '📝', prompt: 'Summarize the following' },
  { label: 'Create social media', icon: '📱', prompt: 'Create a social media post about' },
  { label: 'Start a blank doc', icon: '📄', prompt: '' },
];

interface IdleStateProps {
  onSend: (content: string) => void;
  isLoading: boolean;
  onStop: () => void;
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
  isWebSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  currentModel?: string;
  currentMode?: string;
  onModeChange?: (modeId: string | undefined) => void;
}

export function IdleState({
  onSend,
  isLoading,
  onStop,
  isThinkingEnabled,
  onToggleThinking,
  isWebSearchEnabled,
  onToggleWebSearch,
  currentModel,
  currentMode,
  onModeChange,
}: IdleStateProps) {
  const navigate = useNavigate();
  const chats = useChatsStore(s => s.chats);

  const recentChats = useMemo(() =>
    chats
      .filter(c => !c.archived)
      .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))
      .slice(0, 3),
    [chats]
  );

  return (
    <div className="w-full flex flex-col items-center" style={{ paddingTop: '15vh' }}>
      <h1 className="text-[38px] font-serif-source mb-[10px] text-foreground text-center">
        What would you like to create?
      </h1>

      <div className="w-full" style={{ maxWidth: 'min(1100px, 100%)' }}>
        {recentChats.length > 0 && (
          <div className="mb-6 px-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Recent conversations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => navigate(`/thread/${chat.id}`)}
                  className="text-left p-3 rounded-lg bg-sidebar hover:bg-muted transition-colors border border-border/50"
                >
                  <div className="text-sm font-medium text-foreground line-clamp-1 mb-1">
                    {chat.title || 'Untitled'}
                  </div>
                  {chat.lastMessage && (
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {chat.lastMessage}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground/60 mt-1">
                    {chat.updatedAt ? formatRelativeTime(chat.updatedAt) : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 px-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {CONTENT_STARTERS.map(starter => (
              <button
                key={starter.label}
                onClick={() => {
                  if (starter.prompt) onSend(starter.prompt);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sidebar hover:bg-muted border border-border/50 text-sm text-foreground transition-colors"
              >
                <span>{starter.icon}</span>
                <span>{starter.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4">
          <ChatInput
            isIdle={true}
            onSend={onSend}
            isLoading={isLoading}
            onStop={onStop}
            isThinkingEnabled={isThinkingEnabled}
            onToggleThinking={onToggleThinking}
            isWebSearchEnabled={isWebSearchEnabled}
            onToggleWebSearch={onToggleWebSearch}
            currentModel={currentModel}
            currentMode={currentMode}
            onModeChange={onModeChange}
          />
        </div>
      </div>
    </div>
  );
}
