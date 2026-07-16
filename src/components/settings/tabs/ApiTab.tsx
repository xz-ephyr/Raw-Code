import { useState } from 'react';
import { Activity01Icon, Key01Icon } from '@hugeicons/core-free-icons';
import { SubTabNav } from '@/components/settings/SubTabNav';
import { OverviewTab } from './OverviewTab';
import { KeysTab } from './KeysTab';

const subTabs = [
  { id: 'overview', label: 'Overview', icon: Activity01Icon },
  { id: 'keys', label: 'Keys', icon: Key01Icon },
] as const;

type SubTabId = (typeof subTabs)[number]['id'];

export function ApiTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('overview');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground">API Configuration</h3>
        <p className="text-xs text-muted-foreground mt-1">Manage your provider API keys and view usage statistics.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <SubTabNav tabs={subTabs} activeId={activeSubTab} onChange={(id) => setActiveSubTab(id as SubTabId)} />
      </div>

      {activeSubTab === 'keys' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
            Enter your API keys for the providers you wish to use. Keys are stored locally and never sent anywhere
            except to the provider directly.
          </p>
        </div>
      )}

      <div key={activeSubTab} className="animate-in fade-in duration-200">
        {activeSubTab === 'overview' && <OverviewTab />}
        {activeSubTab === 'keys' && <KeysTab />}
      </div>
    </div>
  );
}
