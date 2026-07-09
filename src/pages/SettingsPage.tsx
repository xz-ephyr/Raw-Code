import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings02Icon, Key01Icon, GlobeIcon, ViewIcon, ZapIcon, FolderLibraryIcon, NoteIcon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { GeneralTab } from '@/components/settings/tabs/GeneralTab';
import { ApiKeysTab } from '@/components/settings/tabs/ApiKeysTab';
import { WebSearchTab } from '@/components/settings/tabs/WebSearchTab';
import { AppearanceTab } from '@/components/settings/tabs/AppearanceTab';
import { BehaviorTab } from '@/components/settings/tabs/BehaviorTab';
import { StorageTab } from '@/components/settings/tabs/StorageTab';
import { ProjectMemoryTab } from '@/components/settings/tabs/ProjectMemoryTab';

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

export function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('general');

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="px-6 py-4 border-b border-border flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate('/thread/new')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          <span>Back to Home</span>
        </button>
        <h2 className="text-[18px] font-bold text-foreground flex items-center gap-2">
          <HugeiconsIcon icon={Settings02Icon} size={20} className="text-muted-foreground" />
          Settings
        </h2>
      </div>
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
    </div>
  );
}
