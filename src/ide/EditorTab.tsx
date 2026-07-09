import { cn } from '@/lib/utils';
import { HugeiconRenderer } from '@/components/ui/HugeiconRenderer';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import type { Tab } from './types';

interface EditorTabProps {
  tab: Tab;
  isActive: boolean;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
}

export function EditorTab({ tab, isActive, onSelect, onClose }: EditorTabProps) {
  return (
    <div
      onClick={onSelect}
      onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); onClose(e as any); } }}
      className={cn(
        'group flex items-center gap-1 px-2 py-2 text-xs font-medium cursor-pointer rounded-t-[8px] select-none flex-1 min-w-0',
        isActive
          ? 'bg-card border-t border-x border-border -mb-px'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
      )}
    >
      {tab.isDirty && <span className="text-foreground/70 shrink-0">•</span>}
      <span className="truncate flex-1 min-w-0">{tab.name}</span>
      <button
        onClick={onClose}
        className="p-0.5 rounded-[4px] hover:bg-muted-foreground/20 transition-colors"
      >
        <HugeiconRenderer icon={Cancel01Icon} size={12} />
      </button>
    </div>
  );
}
