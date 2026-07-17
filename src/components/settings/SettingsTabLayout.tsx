import { useState, useTransition } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Settings02Icon, Activity01Icon, GlobeIcon, FolderLibraryIcon, NoteIcon } from '@hugeicons/core-free-icons';
import { GeneralTab } from './tabs/GeneralTab';
import { ApiTab } from './tabs/ApiTab';
import { WebSearchTab } from './tabs/WebSearchTab';
import { StorageTab } from './tabs/StorageTab';
import { ProjectMemoryTab } from './tabs/ProjectMemoryTab';
import { useProjectStore } from '@/stores/projectStore';

const tabs = [
  { id: 'general', label: 'General', icon: Settings02Icon },
  { id: 'api', label: 'API', icon: Activity01Icon },
  { id: 'web-search', label: 'Web & Search', icon: GlobeIcon },
  { id: 'project-memory', label: 'Project Memory', icon: NoteIcon },
  { id: 'storage', label: 'Storage', icon: FolderLibraryIcon },
] as const;

type TabId = (typeof tabs)[number]['id'];

export function SettingsTabLayout() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [, startTransition] = useTransition();
  const setSettingsOpen = useProjectStore((s) => s.setSettingsOpen);

  return (
    <div className="flex h-full">
      <nav className="w-48 border-r border-border p-3 space-y-1 shrink-0 overflow-y-auto thin-scrollbar flex flex-col bg-background">
        <h2 className="text-sm font-bold text-foreground px-3 pt-1 pb-3">Settings</h2>
        {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => startTransition(() => setActiveTab(tab.id))}
                className={`flex items-center px-3 py-1.5 rounded-[6px] cursor-pointer active:scale-[0.99] transition-transform w-full gap-3 ${
                  isActive ? 'bg-muted' : 'hover:bg-muted'
                }`}
              >
                <div className="shrink-0 flex items-center justify-center w-[18px] h-[18px]">
                  <HugeiconsIcon icon={tab.icon} size={18} color="currentColor" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
      </nav>
      <div className="flex-1 p-6 overflow-y-auto thin-scrollbar bg-sidebar relative">
        <button
          onClick={() => setSettingsOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-[6px] bg-muted/80 hover:bg-muted text-foreground transition-colors shadow-sm"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} />
        </button>
        <div className="max-w-[1200px] mx-auto">
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'api' && <ApiTab />}
          {activeTab === 'web-search' && <WebSearchTab />}
          {activeTab === 'project-memory' && <ProjectMemoryTab />}
          {activeTab === 'storage' && <StorageTab />}
        </div>
      </div>
    </div>
  );
}
