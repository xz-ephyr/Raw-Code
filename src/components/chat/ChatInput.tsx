import { useState, useRef, useEffect, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp02Icon, Add01Icon, Cancel01Icon, StopIcon, Attachment01Icon, CameraAdd01Icon, Atom02Icon, InternetIcon, HandBag01Icon, ArrowRight01Icon, TeamWorkIcon, HandsClappingIcon, QuillWrite02Icon, Bug02Icon } from '@hugeicons/core-free-icons';
import { ThinScrollbar } from '../ui/ThinScrollbar';
import { Dropdown } from '../ui/Dropdown';
import ModelList from './ModelList';
import { AGENTS as MODES } from '@core/agents';
import {
  CONNECTOR_BRAND_COLORS,
  CONNECTOR_ICONS,
  CONNECTOR_DESCRIPTIONS,
  CONNECTORS,
  type ConnectorName,
} from './connectorMentions';

const RECENTLY_USED_KEY = 'connector-recently-used';
const MAX_RECENT = 3;

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

const ICON_MAP: Record<string, any> = {
  Bug02Icon,
  TeamWorkIcon,
  HandsClappingIcon,
  QuillWrite02Icon,
};

const MODE_COLORS: Record<string, string> = {
  'blue-700': '#1d4ed8',
  'orange-700': '#c2410c',
  'purple-700': '#7e22ce',
  'amber-500': '#f59e0b',
};

const NTABS = MODES.map((m) => ({
  icon: ICON_MAP[m.icon] || HandsClappingIcon,
  label: m.label,
  desc: m.description,
  color: m.color,
  colorHex: MODE_COLORS[m.color] || '#888',
}));

function NTabDropdown({ isIdle, currentMode, onModeChange, isProject }: { isIdle?: boolean; currentMode?: string; onModeChange?: (modeId: string | undefined) => void; isProject?: boolean }) {
  const currentIndex = currentMode ? MODES.findIndex((m) => m.id === currentMode) : -1;
  const [currentTab, setCurrentTab] = useState(currentIndex);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const idx = currentMode ? MODES.findIndex((m) => m.id === currentMode) : -1;
    setCurrentTab(idx);
  }, [currentMode]);

  const tab = currentTab >= 0 ? NTABS[currentTab] : undefined;

  if (!isProject) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-foreground hover:bg-muted transition-colors text-xs"
        title={tab ? tab.label : 'Default (no mode)'}
      >
        {tab ? (
          <>
            <HugeiconsIcon icon={tab.icon} size={16} style={{ color: tab.colorHex }} />
            <span style={{ color: tab.colorHex }}>{tab.label}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Default</span>
        )}
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position={isIdle ? 'bottom' : 'top'}
        width="220px"
      >
        {NTABS.map((t, i) => {
          const isActive = i === currentTab;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (isActive) {
                  setCurrentTab(-1);
                  onModeChange?.(undefined);
                } else {
                  setCurrentTab(i);
                  onModeChange?.(MODES[i].id);
                }
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2 rounded-[6px] ${
                isActive
                  ? 'bg-muted'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <HugeiconsIcon icon={t.icon} size={18} style={{ color: isActive ? t.colorHex : undefined }} className={isActive ? '' : 'text-foreground'} />
              <div className="flex flex-col">
                <span style={{ color: isActive ? t.colorHex : undefined }} className={isActive ? '' : 'text-foreground'}>{t.label}</span>
                <span className="text-[10px] text-muted-foreground">{t.desc}</span>
              </div>
            </button>
          );
        })}
      </Dropdown>
    </div>
  );
}

function ToolbarDropdown({ isThinkingEnabled, onToggleThinking, isWebSearchEnabled, onToggleWebSearch, isIdle }: { isThinkingEnabled: boolean; onToggleThinking: () => void; isWebSearchEnabled: boolean; onToggleWebSearch: () => void; isIdle?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const skillsRef = useRef<HTMLDivElement>(null);
  const items = [
    { icon: Attachment01Icon, label: 'Add file or photos', title: 'Upload file or photos' },
    { icon: CameraAdd01Icon, label: 'Take a Screenshots', title: 'Take a screenshot' },
  ];

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (skillsRef.current && !skillsRef.current.contains(e.target as Node)) {
        setIsSkillsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors text-foreground"
        aria-label="Add content"
        title="Add content"
      >
        <HugeiconsIcon icon={Add01Icon} size={18} />
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); setIsSkillsOpen(false); }}
        position={isIdle ? 'bottom' : 'top'}
        width="213px"
      >
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-foreground flex items-center gap-2 rounded-md"
            title={item.title}
          >
            <HugeiconsIcon icon={item.icon} size={16} />
            <span>{item.label}</span>
          </button>
        ))}
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-foreground rounded-[6px] cursor-pointer hover:bg-muted" onClick={onToggleThinking}>
          <HugeiconsIcon icon={Atom02Icon} size={16} />
          <span className="flex-1">Reasoning</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleThinking(); }}
            className={`relative w-9 h-5 rounded-full transition-colors ${isThinkingEnabled ? 'bg-blue-500' : 'bg-muted-foreground'}`}
          >
            <span className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${isThinkingEnabled ? 'translate-x-4' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-foreground rounded-[6px] cursor-pointer hover:bg-muted" onClick={onToggleWebSearch}>
          <HugeiconsIcon icon={InternetIcon} size={16} />
          <span className="flex-1">Web Search</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleWebSearch(); }}
            className={`relative w-9 h-5 rounded-full transition-colors ${isWebSearchEnabled ? 'bg-blue-500' : 'bg-muted-foreground'}`}
          >
            <span className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${isWebSearchEnabled ? 'translate-x-4' : ''}`} />
          </button>
        </div>
        <div className="h-px bg-border mx-3" />
        <div className="relative" ref={skillsRef}>
          <div
            className="flex items-center gap-2 px-3 py-2 text-xs text-foreground rounded-md cursor-pointer hover:bg-muted"
            onClick={() => setIsSkillsOpen(!isSkillsOpen)}
          >
            <HugeiconsIcon icon={HandBag01Icon} size={16} />
            <span className="flex-1">Skills and templates</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-muted-foreground" />
          </div>
          <Dropdown
            isOpen={isSkillsOpen}
            onClose={() => setIsSkillsOpen(false)}
            position="top"
            align="right"
            width="180px"
            className="left-full ml-1 top-0"
          >
            <div className="px-3 py-2 text-xs text-muted-foreground">Skills and templates</div>
          </Dropdown>
        </div>
      </Dropdown>
    </div>
  );
}

function ThinkingPill({
  onToggleThinking,
  size = 'normal',
}: {
  onToggleThinking: () => void;
  size?: 'normal' | 'small';
}) {
  return (
    <button
      type="button"
      onClick={onToggleThinking}
      className={`group flex items-center gap-2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 ${size === 'normal' ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs'} rounded-[6px] font-medium cursor-pointer transition-all active:scale-95`}
      aria-label="Disable thinking mode"
      title="Disable thinking mode"
    >
      <div className={`relative flex items-center justify-center ${size === 'normal' ? 'w-4 h-4' : 'w-3.5 h-3.5'}`}>
        <HugeiconsIcon icon={Atom02Icon} size={size === 'normal' ? 16 : 14} className="group-hover:hidden" />
        <HugeiconsIcon icon={Cancel01Icon} size={size === 'normal' ? 16 : 14} className="hidden group-hover:block" />
      </div>
      Reasoning
    </button>
  );
}

function SendButton({
  isLoading,
  onStop,
  onSend,
  hasValue,
}: {
  isLoading?: boolean;
  onStop?: () => void;
  onSend: () => void;
  hasValue: boolean;
}) {
  const label = isLoading ? 'Stop generation' : 'Send message';
  return (
    <button
      type="button"
      onClick={isLoading ? onStop : onSend}
      disabled={!hasValue && !isLoading}
      className="p-1.5 text-background rounded-full bg-foreground disabled:opacity-50 transition-opacity hover:opacity-90 active:scale-95"
      aria-label={label}
      title={label}
    >
      <HugeiconsIcon
        icon={isLoading ? StopIcon : ArrowUp02Icon}
        size={18}
        color="currentColor"
        strokeWidth={1.5}
      />
    </button>
  );
}

function getRecentlyUsed(): ConnectorName[] {
  try {
    const stored = localStorage.getItem(RECENTLY_USED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentlyUsed(name: ConnectorName) {
  const recent = getRecentlyUsed().filter((n) => n !== name);
  recent.unshift(name);
  localStorage.setItem(RECENTLY_USED_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function ConnectorMentionDropdown({
  query,
  selectedIndex,
  onSelect,
  onClose,
  isIdle,
  connectedConnectors,
}: {
  query: string;
  selectedIndex: number;
  onSelect: (name: string) => void;
  onClose: () => void;
  isIdle?: boolean;
  connectedConnectors: Set<string>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const recentlyUsed = getRecentlyUsed();

  const filtered = CONNECTORS.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!ref.current) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (selectedIndex < 0 || !ref.current) return;
    const active = ref.current.querySelector('[data-active="true"]');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (filtered.length === 0) {
    return (
      <div
        ref={ref}
        className={`absolute left-0 right-0 bg-card border border-border rounded-xl shadow-[0_0_0.5px_0_rgba(0,0,0,0.08)] z-[9999] overflow-hidden ${
          isIdle ? 'top-full mt-1' : 'bottom-full mb-1'
        }`}
      >
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">No connectors found for "{query}"</p>
        </div>
      </div>
    );
  }

  let flatIndex = 0;

  return (
    <div
      ref={ref}
      className={`absolute left-0 right-0 bg-card border border-border rounded-xl shadow-[0_0_0.5px_0_rgba(0,0,0,0.08)] z-[9999] overflow-hidden py-1 max-h-[320px] overflow-y-auto transition-all duration-150 ease-out ${
        isIdle ? 'top-full mt-1' : 'bottom-full mb-1'
      }`}
    >
      {recentlyUsed.length > 0 && !query && (
        <>
          <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Recent
          </div>
          {recentlyUsed.map((name) => {
            const colors = CONNECTOR_BRAND_COLORS[name];
            const iconSrc = CONNECTOR_ICONS[name];
            const isActive = flatIndex === selectedIndex;
            const isConnected = connectedConnectors.has(name);
            flatIndex++;
            return (
              <button
                key={`recent-${name}`}
                type="button"
                data-active={isActive}
                onClick={() => onSelect(name)}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  isActive ? 'bg-muted' : 'hover:bg-muted'
                }`}
              >
                <div className="relative">
                  <img src={iconSrc} alt="" className="w-4 h-4" />
                  {isConnected && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-card" />
                  )}
                </div>
                <span style={{ color: colors.color }} className="font-medium">{name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{CONNECTOR_DESCRIPTIONS[name]}</span>
              </button>
            );
          })}
        </>
      )}

      {filtered.map((name) => {
        const colors = CONNECTOR_BRAND_COLORS[name];
        const iconSrc = CONNECTOR_ICONS[name];
        const isActive = flatIndex === selectedIndex;
        const isConnected = connectedConnectors.has(name);
        flatIndex++;
        return (
          <button
            key={name}
            type="button"
            data-active={isActive}
            onClick={() => onSelect(name)}
            className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
              isActive ? 'bg-muted' : 'hover:bg-muted'
            }`}
          >
            <div className="relative">
              <img src={iconSrc} alt="" className="w-4 h-4" />
              {isConnected && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-card" />
              )}
            </div>
            <span style={{ color: colors.color }} className="font-medium">{name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{CONNECTOR_DESCRIPTIONS[name]}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function ChatInput({ onSend, onStop, isLoading, isIdle, isThinkingEnabled, onToggleThinking, isWebSearchEnabled, onToggleWebSearch, currentModel, currentMode, onModeChange, isProject }: ChatInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);
  const [connectedConnectors, setConnectedConnectors] = useState<Set<string>>(new Set());

  const filteredCount = CONNECTORS.filter((c) =>
    c.toLowerCase().includes(mentionQuery.toLowerCase())
  ).length;

  useEffect(() => {
    const checkConnections = async () => {
      const connected = new Set<string>();
      try {
        const res = await fetch('http://localhost:3001/gmail/status', { method: 'POST' });
        const data = await res.json();
        if (data.connected) connected.add('Gmail');
      } catch {}
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
      editor.style.height = `${Math.min(editor.scrollHeight, 200)}px`;
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
  }, [handleSend, showMentionDropdown, handleBackspace, filteredCount, getSelectedConnectorName, insertMention]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  return (
    <div className="shrink-0 w-full mx-auto px-4 pb-3" style={{ maxWidth: 'min(880px, 100%)' }}>
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
          <ThinScrollbar className="max-h-[145px]">
            <div
              ref={editorRef}
              contentEditable={!isLoading}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              data-placeholder={isLoading ? 'Generating...' : 'Ask anything...'}
              className="w-full py-3 px-4 resize-none outline-none text-[15px] min-h-[48px] bg-transparent overflow-hidden empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
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
