import { useState, useCallback, useEffect } from 'react';
import {
  CONNECTOR_ICONS,
  CONNECTORS,
  SHORTCUT_NAMES,
} from '../components/chat/connectorMentions';
import { API_BASE_URL } from '@/lib/api';

export function useChatMentions(
  getValue: () => string,
  setValue: (next: string, caret: number) => void,
  getCaret: () => number,
  onToggleThinking: () => void,
  onToggleWebSearch: () => void,
) {
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [connectedConnectors, setConnectedConnectors] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkConnections = async () => {
      const connected = new Set<string>();
      const providers = ['Gmail', 'GitHub', 'Telegram', 'YouTube', 'Reddit', 'Twitter'];
      for (const name of providers) {
        try {
          const res = await fetch(`${API_BASE_URL}/connector/${name.toLowerCase()}/status`, { method: 'POST' });
          const data = await res.json();
          if (data.connected) connected.add(name);
        } catch { /* ignore */ }
      }
      setConnectedConnectors(connected);
    };
    checkConnections();
  }, []);

  const detectMention = useCallback((value: string, caret: number): boolean => {
    const textBeforeCursor = value.slice(0, caret);
    const slashIndex = textBeforeCursor.lastIndexOf('/');
    if (slashIndex < 0) {
      setShowMentionDropdown(false);
      return false;
    }
    const prevChar = slashIndex === 0 ? ' ' : textBeforeCursor[slashIndex - 1];
    if (prevChar !== ' ' && prevChar !== '\n' && prevChar !== '\t') {
      setShowMentionDropdown(false);
      return false;
    }
    const query = textBeforeCursor.slice(slashIndex + 1);
    if (query.includes(' ') && query.length >= 20) {
      setShowMentionDropdown(false);
      return false;
    }
    setMentionStart(slashIndex);
    setMentionQuery(query);
    setMentionSelectedIndex(0);
    setShowMentionDropdown(true);
    return true;
  }, []);

  const insertMention = useCallback((name: string, action?: string) => {
    if (name === 'reasoning') {
      onToggleThinking();
      setShowMentionDropdown(false);
      setMentionQuery('');
      setMentionSelectedIndex(0);
      return;
    }
    if (name === 'web-search') {
      onToggleWebSearch();
      setShowMentionDropdown(false);
      setMentionQuery('');
      setMentionSelectedIndex(0);
      return;
    }

    const value = getValue();
    const caret = getCaret();
    const token = action ? `/${name} ${action}` : `/${name}`;
    const before = value.slice(0, mentionStart);
    const after = value.slice(caret);
    const next = `${before}${token} ${after}`;
    setValue(next, before.length + token.length + 1);
    setShowMentionDropdown(false);
    setMentionQuery('');
    setMentionSelectedIndex(0);
  }, [getValue, getCaret, setValue, mentionStart, onToggleThinking, onToggleWebSearch]);

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
    if (showMentionDropdown) return false;
    const value = getValue();
    const caret = getCaret();
    if (caret === 0) return false;
    const before = value.slice(0, caret);
    const match = before.match(/\/(\w+(?:\s+\w+)?)\s*$/);
    if (!match) return false;
    const start = caret - match[0].length;
    const next = value.slice(0, start) + value.slice(caret);
    setValue(next, start);
    return true;
  }, [showMentionDropdown, getValue, getCaret, setValue]);

  const handleInput = useCallback((value: string, caret: number) => {
    detectMention(value, caret);
  }, [detectMention]);

  const handleMentionKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
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
    mentionStart,
    mentionSelectedIndex,
    connectedConnectors,
    setShowMentionDropdown,
    insertMention,
    handleInput,
    handleMentionKeyDown,
    CONNECTOR_ICONS,
  };
}
