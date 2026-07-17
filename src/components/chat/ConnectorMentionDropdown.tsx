import { useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Atom02Icon, InternetIcon } from '@hugeicons/core-free-icons';
import {
  CONNECTOR_ICONS,
  CONNECTOR_DESCRIPTIONS,
  CONNECTORS,
} from './connectorMentions';

interface ConnectorMentionDropdownProps {
  query: string;
  selectedIndex: number;
  onSelect: (name: string) => void;
  onClose: () => void;
  onToggleThinking: () => void;
  onToggleWebSearch: () => void;
  isIdle?: boolean;
  connectedConnectors: Set<string>;
}

const SHORTCUTS = [
  { id: 'reasoning', icon: Atom02Icon, label: 'Reasoning', description: 'Enable deep thinking mode' },
  { id: 'web-search', icon: InternetIcon, label: 'Web Search', description: 'Search the web for information' },
] as const;

export default function ConnectorMentionDropdown({
  query,
  selectedIndex,
  onSelect,
  onClose,
  onToggleThinking,
  onToggleWebSearch,
  isIdle,
  connectedConnectors,
}: ConnectorMentionDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  const filteredConnectors = CONNECTORS.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase()) && connectedConnectors.has(c)
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

  const totalItems = SHORTCUTS.length + filteredConnectors.length;

  if (totalItems === 0) {
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

  function renderShortcut(s: typeof SHORTCUTS[number]) {
    const isActive = flatIndex === selectedIndex;
    flatIndex++;
    const onClick = s.id === 'reasoning' ? onToggleThinking : onToggleWebSearch;
    return (
      <button
        key={`shortcut-${s.id}`}
        type="button"
        data-active={isActive}
        onClick={() => { onClick(); onClose(); }}
        className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2 transition-colors rounded-[6px] ${
          isActive ? 'bg-muted' : 'hover:bg-muted'
        }`}
      >
        <HugeiconsIcon icon={s.icon} size={16} className="text-muted-foreground shrink-0" />
        <span className="font-medium text-foreground">{s.label}</span>
        <span className="text-[10px] text-muted-foreground leading-snug">{s.description}</span>
      </button>
    );
  }

  function renderConnectorButton(name: string) {
    const iconSrc = CONNECTOR_ICONS[name];
    const isActive = flatIndex === selectedIndex;
    flatIndex++;
    return (
      <button
        key={`connector-${name}`}
        type="button"
        data-active={isActive}
        onClick={() => onSelect(name)}
        className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2 transition-colors rounded-[6px] ${
          isActive ? 'bg-muted' : 'hover:bg-muted'
        }`}
      >
        <img src={iconSrc} alt="" loading="lazy" className="w-4 h-4 shrink-0" />
        <span className="font-medium text-foreground">{name}</span>
        <span className="text-xs text-muted-foreground leading-snug">{CONNECTOR_DESCRIPTIONS[name]}</span>
      </button>
    );
  }

  return (
    <div
      ref={ref}
      className={`absolute left-0 right-0 bg-card border border-border rounded-xl shadow-[0_0_0.5px_0_rgba(0,0,0,0.08)] z-[9999] overflow-hidden max-h-[320px] overflow-y-auto transition-all duration-150 ease-out ${
        isIdle ? 'top-full mt-1' : 'bottom-full mb-1'
      }`}
    >
      <div className="p-1.5 space-y-0.5">
        {SHORTCUTS.map((s) => renderShortcut(s))}
        {filteredConnectors.map((name) => renderConnectorButton(name))}
      </div>
    </div>
  );
}
