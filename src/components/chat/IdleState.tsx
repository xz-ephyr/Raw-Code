import ChatInput from './ChatInput';

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
  return (
    <div className="w-full flex flex-col items-center" style={{ paddingTop: '22vh' }}>
      <h1 className="text-[38px] font-serif-source mb-[10px] text-foreground text-center">
        What would you like to create?
      </h1>

      <div className="w-full" style={{ maxWidth: 'min(1100px, 100%)' }}>
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
