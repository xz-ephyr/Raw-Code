import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings02Icon, Activity01Icon, GlobeIcon, ViewIcon, ZapIcon, FolderLibraryIcon, NoteIcon, Mail01Icon, ArrowLeft03Icon } from '@hugeicons/core-free-icons';
import { GeneralTab } from './tabs/GeneralTab';
import { ApiTab } from './tabs/ApiTab';
import { WebSearchTab } from './tabs/WebSearchTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { BehaviorTab } from './tabs/BehaviorTab';
import { StorageTab } from './tabs/StorageTab';
import { ProjectMemoryTab } from './tabs/ProjectMemoryTab';
import { GmailTab } from './tabs/GmailTab';

const tabs = [
  { id: 'general', label: 'General', icon: Settings02Icon },
  { id: 'api', label: 'API', icon: Activity01Icon },
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
    <div className="flex h-full">
      <nav className="w-64 border-r border-border p-3 space-y-1 shrink-0 overflow-y-auto thin-scrollbar flex flex-col">
        <button
          onClick={() => navigate('/thread/new')}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-[6px] hover:bg-muted mb-2"
        >
          <HugeiconsIcon icon={ArrowLeft03Icon} size={14} />
          Back to Home
        </button>
        <h2 className="text-sm font-bold text-foreground px-3 pt-1 pb-3">Settings</h2>
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
          <div className="max-w-[1200px] mx-auto">
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'api' && <ApiTab />}
          {activeTab === 'web-search' && <WebSearchTab />}
          {activeTab === 'gmail' && <GmailTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'behavior' && <BehaviorTab />}
          {activeTab === 'project-memory' && <ProjectMemoryTab />}
          {activeTab === 'storage' && <StorageTab />}
          </div>
        </div>
      </div>
    );
  }

