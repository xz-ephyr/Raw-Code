import { useState, useRef, useEffect } from 'react';
import type { StepType } from '@/types/workflow';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddStepDropdownProps {
  onSelect: (type: StepType) => void;
}

const STEP_OPTIONS: { type: StepType; label: string; description: string }[] = [
  { type: 'tool_call', label: 'Tool Call', description: 'Invoke a registered tool' },
  { type: 'sub_agent', label: 'Sub-agent', description: 'Spawn an autonomous agent' },
  { type: 'connector', label: 'Connector', description: 'Use an external service' },
  { type: 'video_edit', label: 'Video Edit', description: 'Run FFmpeg pipeline via GitHub Actions' },
  { type: 'llm', label: 'LLM', description: 'Configure a model call' },
  { type: 'skill', label: 'Skill', description: 'Enable a capability pack' },
  { type: 'mcp', label: 'MCP', description: 'Connect to an MCP server' },
];

export default function AddStepDropdown({ onSelect }: AddStepDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setFocusedIndex(-1);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev < STEP_OPTIONS.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : STEP_OPTIONS.length - 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < STEP_OPTIONS.length) {
          onSelect(STEP_OPTIONS[focusedIndex].type);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus size={14} />
        Add Step
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Step types"
          className="absolute left-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-xl shadow-black/20 z-50 py-1"
        >
          {STEP_OPTIONS.map((opt, i) => (
            <button
              key={opt.type}
              role="option"
              aria-selected={focusedIndex === i}
              onClick={() => { onSelect(opt.type); setIsOpen(false); }}
              onMouseEnter={() => setFocusedIndex(i)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                focusedIndex === i ? 'bg-muted' : 'hover:bg-muted'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-bold uppercase',
                opt.type === 'tool_call' && 'bg-blue-500/10 text-blue-400',
                opt.type === 'sub_agent' && 'bg-purple-500/10 text-purple-400',
                opt.type === 'connector' && 'bg-green-500/10 text-green-400',
                opt.type === 'video_edit' && 'bg-pink-500/10 text-pink-400',
                opt.type === 'llm' && 'bg-amber-500/10 text-amber-400',
                opt.type === 'skill' && 'bg-orange-500/10 text-orange-400',
                opt.type === 'mcp' && 'bg-teal-500/10 text-teal-400',
              )}>
                {opt.label[0]}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground">{opt.label}</div>
                <div className="text-xs text-muted-foreground truncate">{opt.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
