import { CodeIcon, EyeIcon, SplitIcon, HistoryIcon } from './icons';

export type TabId = 'preview' | 'code' | 'split' | 'history';

interface ArtifactTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: typeof EyeIcon }[] = [
  { id: 'preview', label: 'Preview', icon: EyeIcon },
  { id: 'code', label: 'Code', icon: CodeIcon },
  { id: 'split', label: 'Split', icon: SplitIcon },
  { id: 'history', label: 'History', icon: HistoryIcon },
];

export function ArtifactTabs({ activeTab, onTabChange }: ArtifactTabsProps) {
  return (
    <div className="flex border-b border-neutral-200 dark:border-neutral-700 shrink-0">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-neutral-800 dark:border-neutral-200 text-neutral-800 dark:text-neutral-200'
                : 'border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            <Icon size={14} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
