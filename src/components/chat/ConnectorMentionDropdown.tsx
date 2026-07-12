import { useRef, useEffect } from 'react';
import {
  CONNECTOR_BRAND_COLORS,
  CONNECTOR_ICONS,
  CONNECTOR_DESCRIPTIONS,
  CONNECTORS,
} from './connectorMentions';
import { getRecentlyUsed } from './connectorRecent';

interface ConnectorMentionDropdownProps {
  query: string;
  selectedIndex: number;
  onSelect: (name: string) => void;
  onClose: () => void;
  isIdle?: boolean;
  connectedConnectors: Set<string>;
}

export default function ConnectorMentionDropdown({
  query,
  selectedIndex,
  onSelect,
  onClose,
  isIdle,
  connectedConnectors,
}: ConnectorMentionDropdownProps) {
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

  function renderConnectorButton(name: string, keyPrefix: string) {
    const colors = CONNECTOR_BRAND_COLORS[name];
    const iconSrc = CONNECTOR_ICONS[name];
    const isConnected = connectedConnectors.has(name);
    const isActive = flatIndex === selectedIndex;
    flatIndex++;
    return (
      <button
        key={`${keyPrefix}-${name}`}
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
          {recentlyUsed.map((name) => renderConnectorButton(name, 'recent'))}
        </>
      )}

      {filtered.map((name) => renderConnectorButton(name, 'filtered'))}
    </div>
  );
}
