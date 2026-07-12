import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Attachment01Icon, CameraAdd01Icon, Atom02Icon, InternetIcon, HandBag01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Dropdown } from '../ui/Dropdown';

interface ToolbarDropdownProps {
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
  isWebSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  isIdle?: boolean;
}

export default function ToolbarDropdown({ isThinkingEnabled, onToggleThinking, isWebSearchEnabled, onToggleWebSearch, isIdle }: ToolbarDropdownProps) {
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
