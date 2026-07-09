import { useState, type ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings02Icon, Key01Icon, ZapIcon, FolderLibraryIcon, GlobeIcon, ViewIcon, NoteIcon } from '@hugeicons/core-free-icons';
import { GeneralTab } from './tabs/GeneralTab';
import { ApiKeysTab } from './tabs/ApiKeysTab';
import { WebSearchTab } from './tabs/WebSearchTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { BehaviorTab } from './tabs/BehaviorTab';
import { StorageTab } from './tabs/StorageTab';
import { ProjectMemoryTab } from './tabs/ProjectMemoryTab';

const tabs = [
  { id: 'general', label: 'General', icon: Settings02Icon },
  { id: 'api-keys', label: 'API Keys', icon: Key01Icon },
  { id: 'web-search', label: 'Web & Search', icon: GlobeIcon },
  { id: 'appearance', label: 'Appearance', icon: ViewIcon },
  { id: 'behavior', label: 'Behavior', icon: ZapIcon },
  { id: 'project-memory', label: 'Project Memory', icon: NoteIcon },
  { id: 'storage', label: 'Storage', icon: FolderLibraryIcon },
] as const;

type TabId = (typeof tabs)[number]['id'];

interface SettingsTabLayoutProps {
  header?: ReactNode;
}

export function SettingsTabLayout({ header }: SettingsTabLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  return (
    <>
      {header}
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-64 border-r border-border p-3 space-y-1 shrink-0 overflow-y-auto thin-scrollbar">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-2.5 rounded-[8px] cursor-pointer active:scale-[0.99] transition-transform w-full gap-3 ${
                  isActive ? 'bg-accent' : 'hover:bg-muted'
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
        <div className="flex-1 p-6 overflow-y-auto thin-scrollbar">
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'api-keys' && <ApiKeysTab />}
          {activeTab === 'web-search' && <WebSearchTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'behavior' && <BehaviorTab />}
          {activeTab === 'project-memory' && <ProjectMemoryTab />}
          {activeTab === 'storage' && <StorageTab />}
        </div>
      </div>
    </>
  );
}
