import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Attachment01Icon, CameraAdd01Icon, HandBag01Icon, ArrowRight01Icon, InternetIcon } from '@hugeicons/core-free-icons';
import { Dropdown } from '../ui/Dropdown';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface ToolbarDropdownProps {
  onToggleWebSearch: () => void;
  isIdle?: boolean;
}

export default function ToolbarDropdown({ onToggleWebSearch, isIdle }: ToolbarDropdownProps) {
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
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-muted transition-colors text-foreground"
            aria-label="Add content"
          >
            <HugeiconsIcon icon={Add01Icon} size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Add content</TooltipContent>
      </Tooltip>
      <Dropdown
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); setIsSkillsOpen(false); }}
        position={isIdle ? 'bottom' : 'top'}
        width="213px"
      >
        {items.map((item, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-foreground flex items-center gap-2 rounded-md"
              >
                <HugeiconsIcon icon={item.icon} size={16} />
                <span>{item.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>{item.title}</TooltipContent>
          </Tooltip>
        ))}
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
        <button
          type="button"
          className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-foreground flex items-center gap-2 rounded-md"
          onClick={onToggleWebSearch}
        >
          <HugeiconsIcon icon={InternetIcon} size={16} />
          <span>Web Search</span>
        </button>
      </Dropdown>
    </div>
  );
}
