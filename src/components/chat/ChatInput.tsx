import { useRef, useCallback, useEffect, useState } from 'react';
import ModelList from './ModelList';
import NTabDropdown from './NTabDropdown';
import ToolbarDropdown from './ToolbarDropdown';
import WebSearchPill from './WebSearchPill';
import SendButton from './SendButton';
import ConnectorMentionDropdown from './ConnectorMentionDropdown';
import { useChatMentions } from '../../hooks/useChatMentions';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  isIdle?: boolean;
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
  isWebSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  currentModel?: string;
  currentMode?: string;
  onModeChange?: (modeId: string | undefined) => void;
}

export default function ChatInput({
  onSend,
  onStop,
  isLoading,
  isIdle,
  isThinkingEnabled,
  onToggleThinking,
  isWebSearchEnabled,
  onToggleWebSearch,
  currentModel,
  currentMode,
  onModeChange,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValueState] = useState('');
  const isEmpty = value.trim().length === 0;

  const getValue = useCallback(() => value, [value]);
  const getCaret = useCallback(() => textareaRef.current?.selectionStart ?? value.length, [value.length]);

  const setValue = useCallback((next: string, caret: number) => {
    setValueState(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.selectionStart = el.selectionEnd = Math.min(caret, next.length);
        el.focus();
      }
    });
  }, []);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = `${Math.max(80, Math.min(textareaRef.current.scrollHeight, 300))}px`;
      }
    });
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const {
    showMentionDropdown,
    mentionQuery,
    mentionSelectedIndex,
    connectedConnectors,
    insertMention,
    handleInput,
    handleMentionKeyDown,
  } = useChatMentions(getValue, setValue, getCaret, onToggleThinking, onToggleWebSearch);

  const handleSend = useCallback(() => {
    if (value.trim() && !isLoading) {
      onSend(value);
      setValueState('');
      requestAnimationFrame(adjustHeight);
    }
  }, [value, isLoading, onSend, adjustHeight]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setValueState(next);
    handleInput(next, e.target.selectionStart);
  }, [handleInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (handleMentionKeyDown(e)) return;
    if (e.key === 'Enter') {
      const enterToSend = localStorage.getItem('enter_to_send') !== 'false';
      if (enterToSend) {
        if (!e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      } else {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleSend();
        }
      }
    }
  }, [handleSend, handleMentionKeyDown]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text.includes('\n')) return;
    e.preventDefault();
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = value.slice(0, start) + text + value.slice(end);
    setValue(next, start + text.length);
  }, [value, setValue]);

  return (
    <div className="relative w-full mx-auto rounded-[14px] border border-border/40 dark:border-white/15 bg-sidebar bg-gradient-to-b from-transparent to-muted/[0.04] dark:to-white/[0.02]" style={{ maxWidth: 'min(820px, 100%)', padding: '6px 8px 8px 8px' }}>
      {showMentionDropdown && (
        <ConnectorMentionDropdown
          query={mentionQuery}
          selectedIndex={mentionSelectedIndex}
          onSelect={insertMention}
          onClose={() => showMentionDropdown && insertMention('')}
          onToggleThinking={onToggleThinking}
          onToggleWebSearch={onToggleWebSearch}
          isIdle={isIdle}
          connectedConnectors={connectedConnectors}
        />
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        disabled={isLoading}
        placeholder={isLoading ? 'Generating...' : 'Ask anything...'}
        className="w-full resize-none outline-none text-[15px] leading-relaxed bg-transparent px-2 py-1.5 box-border min-h-[80px] max-h-[300px] placeholder:text-muted-foreground disabled:opacity-60"
      />
      <div className="mt-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-0.5">
          <ToolbarDropdown
            isThinkingEnabled={isThinkingEnabled}
            onToggleThinking={onToggleThinking}
            onToggleWebSearch={onToggleWebSearch}
            isIdle={isIdle}
          />
          <NTabDropdown isIdle={isIdle} currentMode={currentMode} onModeChange={onModeChange} />
          {isWebSearchEnabled && <WebSearchPill onToggleWebSearch={onToggleWebSearch} size="small" />}
        </div>
        <div className="flex items-center gap-1">
          {currentModel && <ModelList currentModel={currentModel} showThinkingOnly={isThinkingEnabled} isIdle={isIdle} />}
          <SendButton isLoading={isLoading} onStop={onStop} onSend={handleSend} hasValue={!isEmpty} />
        </div>
      </div>
    </div>
  );
}
