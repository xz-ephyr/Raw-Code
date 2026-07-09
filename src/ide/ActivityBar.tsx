import { File01Icon, Search01Icon, GitBranchIcon, Settings01Icon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '@/components/ui/HugeiconRenderer';

export type PanelId = 'files' | 'search' | 'git' | 'settings';

interface ActivityBarProps {
  activePanel: PanelId;
  onPanelChange: (panel: PanelId) => void;
}

const ACTIVITY_ITEMS: { id: PanelId; icon: typeof File01Icon; label: string }[] = [
  { id: 'files', icon: File01Icon, label: 'Explorer' },
  { id: 'search', icon: Search01Icon, label: 'Search' },
  { id: 'git', icon: GitBranchIcon, label: 'Source Control' },
  { id: 'settings', icon: Settings01Icon, label: 'Settings' },
];

export function ActivityBar({ activePanel, onPanelChange }: ActivityBarProps) {
  return (
    <div className="w-[48px] shrink-0 bg-muted/30 border-r border-border flex flex-col items-center py-2 gap-1">
      {ACTIVITY_ITEMS.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => onPanelChange(item.id)}
          className={`w-8 h-8 flex items-center justify-center rounded-[8px] transition-colors cursor-pointer relative ${
            activePanel === item.id
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50'
          }`}
          title={item.label}
        >
          {activePanel === item.id && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-foreground rounded-full" />
          )}
          <HugeiconRenderer icon={item.icon} size={20} />
        </button>
      ))}
    </div>
  );
}
