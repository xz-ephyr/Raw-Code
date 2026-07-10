import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings02Icon, Key01Icon, ZapIcon, FolderLibraryIcon, GlobeIcon, ViewIcon, NoteIcon, ArrowTurnBackwardIcon, Mail01Icon } from '@hugeicons/core-free-icons';
import { GeneralTab } from './tabs/GeneralTab';
import { ApiKeysTab } from './tabs/ApiKeysTab';
import { WebSearchTab } from './tabs/WebSearchTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { BehaviorTab } from './tabs/BehaviorTab';
import { StorageTab } from './tabs/StorageTab';
import { ProjectMemoryTab } from './tabs/ProjectMemoryTab';
import { GmailTab } from './tabs/GmailTab';

const tabs = [
  { id: 'general', label: 'General', icon: Settings02Icon },
  { id: 'api-keys', label: 'API Keys', icon: Key01Icon },
  { id: 'web-search', label: 'Web & Search', icon: GlobeIcon },
  { id: 'gmail', label: 'Gmail', icon: Mail01Icon },
  { id: 'appearance', label: 'Appearance', icon: ViewIcon },
  { id: 'behavior', label: 'Behavior', icon: ZapIcon },
  { id: 'project-memory', label: 'Project Memory', icon: NoteIcon },
  { id: 'storage', label: 'Storage', icon: FolderLibraryIcon },
] as const;

type TabId = (typeof tabs)[number]['id'];

export function SettingsTabLayout() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center gap-3">
        <button
          onClick={() => navigate('/thread/new')}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={16} />
        </button>
        <h2 className="text-sm font-bold text-foreground">Settings</h2>
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <nav className="w-64 border-r border-border p-3 space-y-1 shrink-0 overflow-y-auto thin-scrollbar">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-2 rounded-[8px] cursor-pointer active:scale-[0.99] transition-transform w-full gap-3 ${
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
        <div className="flex-1 p-6 overflow-y-auto thin-scrollbar">
          <div className="max-w-[1000px] mx-auto">
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'api-keys' && <ApiKeysTab />}
          {activeTab === 'web-search' && <WebSearchTab />}
          {activeTab === 'gmail' && <GmailTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'behavior' && <BehaviorTab />}
          {activeTab === 'project-memory' && <ProjectMemoryTab />}
          {activeTab === 'storage' && <StorageTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
