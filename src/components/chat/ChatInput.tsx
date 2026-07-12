import { useState, useRef, useEffect, useCallback } from 'react';
import { ThinScrollbar } from '../ui/ThinScrollbar';
import ModelList from './ModelList';
import NTabDropdown from './NTabDropdown';
import ToolbarDropdown from './ToolbarDropdown';
import ThinkingPill from './ThinkingPill';
import SendButton from './SendButton';
import ConnectorMentionDropdown from './ConnectorMentionDropdown';
import {
  CONNECTOR_BRAND_COLORS,
  CONNECTOR_ICONS,
  CONNECTORS,
  type ConnectorName,
} from './connectorMentions';
import { addRecentlyUsed } from './connectorRecent';

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
  isProject?: boolean;
}



export default function ChatInput({ onSend, onStop, isLoading, isIdle, isThinkingEnabled, onToggleThinking, isWebSearchEnabled, onToggleWebSearch, currentModel, currentMode, onModeChange, isProject }: ChatInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);
  const [connectedConnectors, setConnectedConnectors] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkConnections = async () => {
      const connected = new Set<string>();
      try {
        const res = await fetch('http://localhost:3001/gmail/status', { method: 'POST' });
        const data = await res.json();
        if (data.connected) connected.add('Gmail');
      } catch { /* ignore */ }
      setConnectedConnectors(connected);
    };
    checkConnections();
  }, []);

  const getTextContent = useCallback(() => {
    if (!editorRef.current) return '';
    let text = '';
    editorRef.current.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node instanceof HTMLElement && node.hasAttribute('data-mention')) {
        const name = node.getAttribute('data-mention');
        const action = node.getAttribute('data-action');
        text += action ? `/${name} ${action}` : `/${name}`;
      }
    });
    return text;
  }, []);

  const adjustHeight = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.style.height = 'auto';
      editor.style.height = `${Math.min(editor.scrollHeight, 190)}px`;
    }
  }, []);

  const updateIsEmpty = useCallback(() => {
    const text = getTextContent();
    setIsEmpty(text.trim().length === 0);
  }, [getTextContent]);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  const handleSend = useCallback(() => {
    const text = getTextContent();
    if (text.trim() && !isLoading) {
      onSend(text);
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setIsEmpty(true);
    }
  }, [getTextContent, isLoading, onSend]);

  const insertMention = useCallback((name: string, action?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const sel = window.getSelection();
    if (!sel) return;

    const range = sel.getRangeAt(0);

    // Find the text node containing the /
    const tempRange = document.createRange();
    tempRange.setStart(editor, 0);
    tempRange.setEnd(range.startContainer, range.startOffset);
    const fullText = tempRange.toString();
    const slashIndex = fullText.lastIndexOf('/');

    if (slashIndex >= 0) {
      // Walk through nodes to find the one containing the /
      let charCount = 0;
      let targetNode: Node | null = null;
      let targetOffset = 0;

      const walkNodes = (node: Node) => {
        if (targetNode) return;
        if (node.nodeType === Node.TEXT_NODE) {
          const textLen = node.textContent?.length || 0;
          if (charCount + textLen > slashIndex) {
            targetNode = node;
            targetOffset = slashIndex - charCount;
          }
          charCount += textLen;
        } else {
          node.childNodes.forEach(walkNodes);
        }
      };
      walkNodes(editor);

      if (targetNode) {
        const deleteRange = document.createRange();
        deleteRange.setStart(targetNode, targetOffset);
        deleteRange.setEnd(range.startContainer, range.startOffset);
        deleteRange.deleteContents();
      }
    }

    addRecentlyUsed(name as ConnectorName);

    const colors = CONNECTOR_BRAND_COLORS[name];
    const iconSrc = CONNECTOR_ICONS[name];

    const pill = document.createElement('span');
    pill.contentEditable = 'false';
    pill.setAttribute('data-mention', name);
    if (action) pill.setAttribute('data-action', action);
    pill.className = 'inline-flex items-center gap-1 px-2 py-[2px] rounded-[6px] text-[14px] font-medium cursor-default select-none align-baseline relative top-[1px]';
    pill.style.backgroundColor = colors.bg;
    pill.style.color = colors.color;

    const img = document.createElement('img');
    img.src = iconSrc;
    img.alt = '';
    img.className = 'w-4 h-4';
    pill.appendChild(img);

    const labelText = action ? `${name} ${action}` : name;
    const textNode = document.createTextNode(labelText);
    pill.appendChild(textNode);

    const spaceAfter = document.createTextNode('\u00A0');

    range.insertNode(spaceAfter);
    range.insertNode(pill);

    range.setStartAfter(spaceAfter);
    range.setEndAfter(spaceAfter);
    sel.removeAllRanges();
    sel.addRange(range);

    const trailing = document.createTextNode('');
    spaceAfter.parentNode?.insertBefore(trailing, spaceAfter.nextSibling);

    setShowMentionDropdown(false);
    setMentionQuery('');
    setMentionSelectedIndex(0);
    adjustHeight();
    updateIsEmpty();
  }, [adjustHeight, updateIsEmpty]);

  const getSelectedConnectorName = useCallback(() => {
    const filtered = CONNECTORS.filter((c) =>
      c.toLowerCase().includes(mentionQuery.toLowerCase())
    );
    if (filtered.length === 0) return null;
    const idx = Math.min(mentionSelectedIndex, filtered.length - 1);
    return filtered[idx] || filtered[0] || null;
  }, [mentionQuery, mentionSelectedIndex]);

  const handleBackspace = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;

    const range = sel.getRangeAt(0);
    if (!range.collapsed) return false;

    const node = range.startContainer;
    const offset = range.startOffset;

    if (node.nodeType === Node.TEXT_NODE && offset > 0) {
      const text = node.textContent || '';
      if (text[offset - 1] === '\u00A0' && offset >= 2) {
        const prevNode = node.previousSibling;
        if (prevNode instanceof HTMLElement && prevNode.hasAttribute('data-mention')) {
          const spaceNode = node;
          const spaceOffset = offset - 1;
          range.setStartBefore(prevNode);
          range.setEnd(spaceNode, spaceOffset);
          range.deleteContents();
          adjustHeight();
          updateIsEmpty();
          return true;
        }
      }
    }

    if (node instanceof HTMLElement && node.hasAttribute('data-mention')) {
      const prevNode = node.previousSibling;
      if (prevNode) {
        range.setStartBefore(node);
        range.setEndAfter(node);
        range.deleteContents();
        adjustHeight();
        updateIsEmpty();
        return true;
      }
    }

    return false;
  }, [adjustHeight, updateIsEmpty]);

  const handleInput = useCallback(() => {
    adjustHeight();
    updateIsEmpty();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) {
      setShowMentionDropdown(false);
      return;
    }

    const text = textNode.textContent || '';
    const cursorPos = range.startOffset;
    const textBeforeCursor = text.substring(0, cursorPos);
    const slashIndex = textBeforeCursor.lastIndexOf('/');

    if (slashIndex >= 0 && (slashIndex === 0 || text[slashIndex - 1] === ' ' || text[slashIndex - 1] === '\u00A0')) {
      const query = textBeforeCursor.substring(slashIndex + 1);
      if (!query.includes(' ') || query.length < 20) {
        setMentionQuery(query);
        setMentionSelectedIndex(0);
        setShowMentionDropdown(true);
        return;
      }
    }

    setShowMentionDropdown(false);
  }, [adjustHeight, updateIsEmpty]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (showMentionDropdown) {
      const count = CONNECTORS.filter((c) =>
        c.toLowerCase().includes(mentionQuery.toLowerCase())
      ).length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex((i) => (count === 0 ? 0 : (i + 1) % count));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex((i) => (count === 0 ? 0 : (i - 1 + count) % count));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const name = getSelectedConnectorName();
        if (name) {
          insertMention(name);
        } else {
          setShowMentionDropdown(false);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionDropdown(false);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        return;
      }
    }
    if (e.key === 'Backspace') {
      if (handleBackspace()) {
        e.preventDefault();
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend, showMentionDropdown, handleBackspace, getSelectedConnectorName, insertMention, mentionQuery]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  return (
    <div className="shrink-0 w-full mx-auto px-4 pb-3" style={{ maxWidth: 'min(780px, 100%)' }}>
      <div className="relative">
        {showMentionDropdown && (
          <ConnectorMentionDropdown
            query={mentionQuery}
            selectedIndex={mentionSelectedIndex}
            onSelect={insertMention}
            onClose={() => setShowMentionDropdown(false)}
            isIdle={isIdle}
            connectedConnectors={connectedConnectors}
          />
        )}
        <div className="bg-muted rounded-[12px] relative z-10 border border-border/60">
          <ThinScrollbar className="max-h-[135px]">
            <div
              ref={editorRef}
              contentEditable={!isLoading}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              data-placeholder={isLoading ? 'Generating...' : 'Ask anything...'}
              className="w-full py-2.5 px-4 resize-none outline-none text-[15px] min-h-[38px] bg-transparent overflow-hidden empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
              suppressContentEditableWarning
            />
          </ThinScrollbar>

          <div className="flex flex-col px-3 py-1.5 bg-transparent gap-1">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                <ToolbarDropdown isThinkingEnabled={isThinkingEnabled} onToggleThinking={onToggleThinking} isWebSearchEnabled={isWebSearchEnabled} onToggleWebSearch={onToggleWebSearch} isIdle={isIdle} />
                <NTabDropdown isIdle={isIdle} currentMode={currentMode} onModeChange={onModeChange} isProject={isProject} />
                {isThinkingEnabled && <ThinkingPill onToggleThinking={onToggleThinking} size="small" />}
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
