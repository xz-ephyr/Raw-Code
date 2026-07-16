import { useRef, useCallback, useEffect, useState } from 'react';
import { ThinScrollbar } from '../ui/ThinScrollbar';
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



export default function ChatInput({ onSend, onStop, isLoading, isIdle, isThinkingEnabled, onToggleThinking, isWebSearchEnabled, onToggleWebSearch, currentModel, currentMode, onModeChange }: ChatInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  function collectText(node: Node): string {
    let text = '';
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      } else if (child instanceof HTMLElement && child.hasAttribute('data-mention')) {
        const name = child.getAttribute('data-mention');
        const action = child.getAttribute('data-action');
        text += action ? `/${name} ${action}` : `/${name}`;
      } else {
        text += collectText(child);
      }
    }
    return text;
  }

  const getTextContent = useCallback(() => {
    if (!editorRef.current) return '';
    return collectText(editorRef.current);
  }, []);

  const adjustHeight = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.style.height = 'auto';
      requestAnimationFrame(() => {
        if (editor) {
          editor.style.height = `${Math.min(editor.scrollHeight, 400)}px`;
        }
      });
    }
  }, []);

  const updateIsEmpty = useCallback(() => {
    const text = getTextContent();
    setIsEmpty(text.trim().length === 0);
  }, [getTextContent]);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  const {
    showMentionDropdown,
    mentionQuery,
    mentionSelectedIndex,
    connectedConnectors,
    insertMention,
    handleInput,
    handleMentionKeyDown,
  } = useChatMentions(editorRef, onToggleThinking, onToggleWebSearch, adjustHeight, updateIsEmpty);

  const handleSend = useCallback(() => {
    const text = getTextContent();
    if (text.trim() && !isLoading) {
      onSend(text);
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setIsEmpty(true);
      adjustHeight();
    }
  }, [getTextContent, isLoading, onSend, adjustHeight]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
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

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      sel.deleteFromDocument();
      sel.getRangeAt(0).insertNode(document.createTextNode(text));
      sel.collapseToEnd();
    }
  }, []);

  return (
    <div className="shrink-0 mx-auto w-full pb-1.5 mb-3 bg-sidebar rounded-[12px] border border-gray-500/10 dark:border-white/10" style={{ maxWidth: 'min(820px, 100%)' }}>
      <div className="relative px-2">
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
        <div className="relative z-10">
          <ThinScrollbar className="max-h-[400px]">
            <div
              ref={editorRef}
              contentEditable={!isLoading}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              data-placeholder={isLoading ? 'Generating...' : 'Ask anything...'}
              className="w-full py-2.5 px-2 resize-none outline-none text-[15px] min-h-[68px] bg-sidebar overflow-hidden transition-[height] duration-200 ease-out empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
              suppressContentEditableWarning
            />
          </ThinScrollbar>

          <div className="flex flex-col px-1 pb-0.5 bg-transparent gap-1">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                <ToolbarDropdown isThinkingEnabled={isThinkingEnabled} onToggleThinking={onToggleThinking} onToggleWebSearch={onToggleWebSearch} isIdle={isIdle} />
                <NTabDropdown isIdle={isIdle} currentMode={currentMode} onModeChange={onModeChange} />
                {isWebSearchEnabled && <WebSearchPill onToggleWebSearch={onToggleWebSearch} size="small" />}
              </div>
              <div className="flex items-center gap-1">
                {currentModel && <ModelList currentModel={currentModel} showThinkingOnly={isThinkingEnabled} isIdle={isIdle} />}
                <SendButton isLoading={isLoading} onStop={onStop} onSend={handleSend} hasValue={!isEmpty} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
