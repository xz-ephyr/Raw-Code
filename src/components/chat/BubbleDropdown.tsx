import { useRef, useEffect } from 'react';
import { Footprints, Brain } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';

interface BubbleDropdownProps {
  onShowReasoning?: () => void;
  onClose: () => void;
}

export function BubbleDropdown({ onShowReasoning, onClose }: BubbleDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isThinkingEnabled = useProjectStore(s => s.isThinkingEnabled);
  const setIsThinkingEnabled = useProjectStore(s => s.setIsThinkingEnabled);
  const setIsWebSearchEnabled = useProjectStore(s => s.setIsWebSearchEnabled);

  const handleToggleThinking = () => {
    const next = !isThinkingEnabled;
    if (next) setIsWebSearchEnabled(false);
    setIsThinkingEnabled(next);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 mb-1 min-w-[160px] rounded-lg border border-border bg-card shadow-xl animate-in fade-in slide-in-from-bottom-1 duration-150 z-50"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground cursor-pointer hover:bg-muted transition-colors rounded-lg" onClick={handleToggleThinking}>
        <Brain size={15} className="text-muted-foreground shrink-0" />
        <span className="flex-1">Reasoning</span>
        <span className={`relative w-8 h-4 rounded-full transition-colors ${isThinkingEnabled ? 'bg-blue-500' : 'bg-muted-foreground/40'}`}>
          <span className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${isThinkingEnabled ? 'translate-x-4' : ''}`} />
        </span>
      </div>
      {onShowReasoning && (
        <>
          <div className="h-px bg-border mx-2" />
          <button
            onClick={onShowReasoning}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors rounded-lg"
          >
            <Footprints size={15} className="text-muted-foreground" />
            Show Reasoning
          </button>
        </>
      )}
    </div>
  );
}
