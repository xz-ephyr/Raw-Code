import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  WavingHand02Icon,
  HandsClappingIcon,
} from '@hugeicons/core-free-icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dropdown } from '../ui/Dropdown';
import { PERSONAS } from '@core/persona';

const antigravitySvg = '/antigravity-color.svg';

const ICON_MAP: Record<string, any> = {
  WavingHand02Icon,
  HandsClappingIcon,
};

const NTABS = PERSONAS.map((m) => ({
  id: m.id,
  icon: ICON_MAP[m.icon] || WavingHand02Icon,
  label: m.label,
  description: m.description,
  nativeIcon: m.icon === 'AntigravityIcon',
}));

const DEFAULT_MODE_ID = 'default';

interface NTabDropdownProps {
  isIdle?: boolean;
  currentMode?: string;
  onModeChange?: (modeId: string | undefined) => void;
}

export default function NTabDropdown({ isIdle, currentMode, onModeChange }: NTabDropdownProps) {
  const selectedIndex = currentMode
    ? NTABS.findIndex((t) => t.id === currentMode)
    : NTABS.findIndex((t) => t.id === DEFAULT_MODE_ID);
  const [currentTab, setCurrentTab] = useState(selectedIndex < 0 ? 0 : selectedIndex);
  const [isOpen, setIsOpen] = useState(false);

  const tab = NTABS[currentTab] ?? NTABS[0];

  function renderIcon(opt: typeof NTABS[number], size = 16) {
    if (opt.nativeIcon) {
      return <img src={antigravitySvg} width={size} height={size} alt="" />;
    }
    return <HugeiconsIcon icon={opt.icon} size={size} />;
  }

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded-[6px] transition-colors text-xs ${
              tab.id === 'teamwork'
                ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-400/10'
                : 'text-foreground hover:bg-muted'
            }`}
          >
          {renderIcon(tab, 16)}
          <span>{tab.label}</span>
        </button>
        </TooltipTrigger>
        <TooltipContent>{tab.label}</TooltipContent>
      </Tooltip>
      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position={isIdle ? 'bottom' : 'top'}
        width="240px"
      >
        {NTABS.map((t, i) => {
          const isActive = i === currentTab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setCurrentTab(i);
                onModeChange?.(t.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-2 py-1.5 text-xs transition-colors flex items-center gap-2 rounded-[6px] ${
                isActive
                  ? 'bg-muted'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <span className="size-6 rounded-md flex items-center justify-center shrink-0 text-muted-foreground">
                {renderIcon(t, 14)}
              </span>
              <div className="flex flex-col gap-0">
                <span className="text-xs font-medium">{t.label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{t.description}</span>
              </div>
            </button>
          );
        })}
      </Dropdown>
    </div>
  );
}
