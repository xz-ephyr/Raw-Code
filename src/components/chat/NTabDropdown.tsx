import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { TeamWorkIcon, HandsClappingIcon, QuillWrite02Icon, Bug02Icon } from '@hugeicons/core-free-icons';
import { Dropdown } from '../ui/Dropdown';
import { AGENTS as MODES } from '@core/agents';

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

interface NTabDropdownProps {
  isIdle?: boolean;
  currentMode?: string;
  onModeChange?: (modeId: string | undefined) => void;
  isProject?: boolean;
}

export default function NTabDropdown({ isIdle, currentMode, onModeChange, isProject }: NTabDropdownProps) {
  const currentIndex = currentMode ? MODES.findIndex((m) => m.id === currentMode) : -1;
  const [currentTab, setCurrentTab] = useState(currentIndex);
  const [isOpen, setIsOpen] = useState(false);

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
