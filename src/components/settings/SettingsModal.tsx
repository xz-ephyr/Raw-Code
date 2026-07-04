import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings02Icon, Key01Icon, ZapIcon, Cancel01Icon, FolderLibraryIcon, GlobeIcon, ViewIcon } from '@hugeicons/core-free-icons';
import { GeneralTab } from './tabs/GeneralTab';
import { ApiKeysTab } from './tabs/ApiKeysTab';
import { WebSearchTab } from './tabs/WebSearchTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { BehaviorTab } from './tabs/BehaviorTab';
import { StorageTab } from './tabs/StorageTab';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tabs = [
  { id: 'general', label: 'General', icon: Settings02Icon },
  { id: 'api-keys', label: 'API Keys', icon: Key01Icon },
  { id: 'web-search', label: 'Web & Search', icon: GlobeIcon },
  { id: 'appearance', label: 'Appearance', icon: ViewIcon },
  { id: 'behavior', label: 'Behavior', icon: ZapIcon },
  { id: 'storage', label: 'Storage', icon: FolderLibraryIcon },
] as const;

type TabId = (typeof tabs)[number]['id'];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[4px] z-50">
      <div className="bg-[#2a2a2a] rounded-[16px] w-[min(1100px,95vw)] h-[85vh] min-h-[500px] shadow-2xl shadow-black/30 border border-neutral-800 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <h2 className="text-[18px] font-bold text-neutral-200 flex items-center gap-2">
            <HugeiconsIcon icon={Settings02Icon} size={20} className="text-neutral-400" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-64 border-r border-neutral-800 p-3 space-y-1 shrink-0 overflow-y-auto thin-scrollbar">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-2.5 rounded-[8px] cursor-pointer active:scale-[0.99] transition-transform w-full gap-3 ${
                    isActive ? 'bg-[#404040]' : 'hover:bg-[#2a2a2a]'
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
            {activeTab === 'storage' && <StorageTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
