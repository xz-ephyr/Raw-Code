import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { QuillWrite02Icon, Search01Icon, Video01Icon, AiChat01Icon } from '@hugeicons/core-free-icons';
import { Dropdown } from '../ui/Dropdown';
import { PERSONAS } from '@core/persona';

const ICON_MAP: Record<string, any> = {
  QuillWrite02Icon,
  Search01Icon,
  Video01Icon,
  AiChat01Icon,
};

const MODE_COLORS: Record<string, string> = {
  'green-500': '#22c55e',
  'blue-500': '#3b82f6',
  'purple-500': '#a855f7',
  'orange-500': '#f97316',
};

const NTABS = PERSONAS.map((m) => ({
  icon: ICON_MAP[m.icon] || QuillWrite02Icon,
  label: m.label,
  color: m.color,
  colorHex: MODE_COLORS[m.color] || '#888',
}));

interface NTabDropdownProps {
  isIdle?: boolean;
  currentMode?: string;
  onModeChange?: (modeId: string | undefined) => void;
}

export default function NTabDropdown({ isIdle, currentMode, onModeChange }: NTabDropdownProps) {
  const currentIndex = currentMode ? PERSONAS.findIndex((m) => m.id === currentMode) : -1;
  const [currentTab, setCurrentTab] = useState(currentIndex);
  const [isOpen, setIsOpen] = useState(false);

  const tab = currentTab >= 0 ? NTABS[currentTab] : undefined;

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
        width="180px"
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
                  onModeChange?.(PERSONAS[i].id);
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
              <span style={{ color: isActive ? t.colorHex : undefined }} className={isActive ? '' : 'text-foreground'}>{t.label}</span>
            </button>
          );
        })}
      </Dropdown>
    </div>
  );
}
