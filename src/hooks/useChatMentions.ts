import { useState, useCallback, useEffect } from 'react';
import {
  CONNECTOR_ICONS,
  CONNECTORS,
  SHORTCUT_NAMES,
} from '../components/chat/connectorMentions';

export function useChatMentions(
  editorRef: React.RefObject<HTMLDivElement | null>,
  onToggleThinking: () => void,
  onToggleWebSearch: () => void,
  adjustHeight: () => void,
  updateIsEmpty: () => void,
) {
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [connectedConnectors, setConnectedConnectors] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkConnections = async () => {
      const connected = new Set<string>();
      const providers = ['Gmail', 'GitHub', 'Telegram', 'YouTube', 'Reddit', 'Twitter'];
      for (const name of providers) {
        try {
          const res = await fetch(`http://localhost:3001/connector/${name.toLowerCase()}/status`, { method: 'POST' });
          const data = await res.json();
          if (data.connected) connected.add(name);
        } catch { /* ignore */ }
      }
      setConnectedConnectors(connected);
    };
    checkConnections();
  }, []);

  const insertMention = useCallback((name: string, action?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const sel = window.getSelection();
    if (!sel) return;

    const range = sel.getRangeAt(0);

    const tempRange = document.createRange();
    tempRange.setStart(editor, 0);
    tempRange.setEnd(range.startContainer, range.startOffset);
    const fullText = tempRange.toString();
    const slashIndex = fullText.lastIndexOf('/');

    if (slashIndex >= 0) {
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

    if (name === 'reasoning') {
      onToggleThinking();
      setShowMentionDropdown(false);
      setMentionQuery('');
      setMentionSelectedIndex(0);
      adjustHeight();
      updateIsEmpty();
      return;
    }
    if (name === 'web-search') {
      onToggleWebSearch();
      setShowMentionDropdown(false);
      setMentionQuery('');
      setMentionSelectedIndex(0);
      adjustHeight();
      updateIsEmpty();
      return;
    }

    const iconSrc = CONNECTOR_ICONS[name];

    const pill = document.createElement('span');
    pill.contentEditable = 'false';
    pill.setAttribute('data-mention', name);
    if (action) pill.setAttribute('data-action', action);
    pill.className = 'inline-flex items-center gap-1.5 text-[14px] font-medium cursor-default select-none';
    pill.style.color = '#60A5FA';

    const img = document.createElement('img');
    img.src = iconSrc;
    img.alt = '';
    img.className = 'w-[18px] h-[18px]';
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
  }, [adjustHeight, onToggleThinking, onToggleWebSearch, updateIsEmpty, editorRef]);

  const getSelectedConnectorName = useCallback(() => {
    const query = mentionQuery.toLowerCase();
    const connectors = CONNECTORS.filter((c) =>
      c.toLowerCase().includes(query)
    );
    const totalCount = SHORTCUT_NAMES.length + connectors.length;
    if (totalCount === 0) return null;
    const idx = Math.min(mentionSelectedIndex, totalCount - 1);
    if (idx < SHORTCUT_NAMES.length) return SHORTCUT_NAMES[idx];
    return connectors[idx - SHORTCUT_NAMES.length] || connectors[0] || null;
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

  const handleMentionKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (showMentionDropdown) {
      const query = mentionQuery.toLowerCase();
      const shortcutCount = SHORTCUT_NAMES.length;
      const connectorCount = CONNECTORS.filter((c) =>
        c.toLowerCase().includes(query)
      ).length;
      const count = shortcutCount + connectorCount;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex((i) => (count === 0 ? 0 : (i + 1) % count));
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex((i) => (count === 0 ? 0 : (i - 1 + count) % count));
        return true;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const name = getSelectedConnectorName();
        if (name) {
          insertMention(name);
        } else {
          setShowMentionDropdown(false);
        }
        return true;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionDropdown(false);
        return true;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        return true;
      }
    }
    if (e.key === 'Backspace') {
      if (handleBackspace()) {
        e.preventDefault();
        return true;
      }
    }
    return false;
  }, [showMentionDropdown, handleBackspace, getSelectedConnectorName, insertMention, mentionQuery]);

  return {
    showMentionDropdown,
    mentionQuery,
    mentionSelectedIndex,
    connectedConnectors,
    setShowMentionDropdown,
    insertMention,
    handleInput,
    handleMentionKeyDown,
  };
}
