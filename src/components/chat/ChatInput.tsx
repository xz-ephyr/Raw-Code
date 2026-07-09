import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp02Icon, Add01Icon, Cancel01Icon, StopIcon, Attachment01Icon, CameraAdd01Icon, Atom02Icon, InternetIcon, HandBag01Icon, ArrowRight01Icon, TeamWorkIcon, HandsClappingIcon, QuillWrite02Icon, Bug02Icon } from '@hugeicons/core-free-icons';
import { ThinScrollbar } from '../ui/ThinScrollbar';
import ModelList from './ModelList';
import { AGENTS as MODES } from '@core/agents';

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const idx = currentMode ? MODES.findIndex((m) => m.id === currentMode) : -1;
    setCurrentTab(idx);
  }, [currentMode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const tab = currentTab >= 0 ? NTABS[currentTab] : undefined;

  if (!isProject) {
    return null;
  }

  return (
    <div className="relative" ref={ref}>
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
      {isOpen && (
        <div className={`absolute ${isIdle ? 'top-full mt-1' : 'bottom-full mb-1'} left-0 w-[220px] bg-card border border-border rounded-xl shadow-xl shadow-black/30 z-[9999] overflow-hidden`}>
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
        </div>
      )}
    </div>
  );
}

function ToolbarDropdown({ isThinkingEnabled, onToggleThinking, isWebSearchEnabled, onToggleWebSearch, isIdle }: { isThinkingEnabled: boolean; onToggleThinking: () => void; isWebSearchEnabled: boolean; onToggleWebSearch: () => void; isIdle?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const items = [
    { icon: Attachment01Icon, label: 'Add file or photos', title: 'Upload file or photos' },
    { icon: CameraAdd01Icon, label: 'Take a Screenshots', title: 'Take a screenshot' },
  ];

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsSkillsOpen(false);
        return;
      }
      if (isSkillsOpen && skillsRef.current && !skillsRef.current.contains(e.target as Node)) {
        setIsSkillsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isSkillsOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors text-foreground"
        aria-label="Add content"
        title="Add content"
      >
        <HugeiconsIcon icon={Add01Icon} size={18} />
      </button>
      {isOpen && (
        <div className={`absolute ${isIdle ? 'top-full mt-1' : 'bottom-full mb-1'} left-0 w-[213px] bg-card border border-border rounded-xl shadow-xl shadow-black/30 z-[9999]`}>
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
            {isSkillsOpen && (
              <div className="absolute left-full ml-1 top-0 w-[180px] bg-card border border-border rounded-xl shadow-xl shadow-black/30 z-[9999] overflow-hidden">
                <div className="px-3 py-2 text-xs text-muted-foreground">Skills and templates</div>
              </div>
            )}
          </div>
        </div>
      )}
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

export default function ChatInput({ onSend, onStop, isLoading, isIdle, isThinkingEnabled, onToggleThinking, isWebSearchEnabled, onToggleWebSearch, currentModel, currentMode, onModeChange, isProject }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  const handleSend = () => {
    if (value.trim() && !isLoading) {
      onSend(value);
      setValue('');
    }
  };

  const commonTextareaProps = {
    ref: textareaRef,
    value,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value),
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    placeholder: isLoading ? 'Generating...' : 'Ask anything...',
    disabled: isLoading,
  };

  return (
    <div className="shrink-0 w-full mx-auto px-4 pb-3" style={{ maxWidth: 'min(880px, 100%)' }}>
      <div className="bg-muted rounded-[12px] relative z-10 border border-border/60">
        <ThinScrollbar className="max-h-[145px]">
          <textarea
            {...commonTextareaProps}
            className="w-full py-3 px-4 resize-none outline-none text-[15px] min-h-[48px] bg-transparent overflow-hidden"
            rows={1}
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
              <SendButton isLoading={isLoading} onStop={onStop} onSend={handleSend} hasValue={!!value.trim()} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
