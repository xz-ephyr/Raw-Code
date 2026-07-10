import { useState, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Activity01Icon, Key01Icon } from '@hugeicons/core-free-icons';
import { OverviewTab } from './OverviewTab';
import { KeysTab, type KeysTabHandle } from './KeysTab';

const subTabs = [
  { id: 'overview', label: 'Overview', icon: Activity01Icon },
  { id: 'keys', label: 'Keys', icon: Key01Icon },
] as const;

type SubTabId = (typeof subTabs)[number]['id'];

export function ApiTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('overview');
  const keysTabRef = useRef<KeysTabHandle>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<'saved' | 'error' | null>(null);

  const handleSaveKeys = async () => {
    if (!keysTabRef.current) {
      console.error('KeysTab ref not available');
      return;
    }
    setSaving(true);
    setSaved(null);
    try {
      await keysTabRef.current.save();
      setSaved('saved');
      setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      console.error('Failed to save keys:', e);
      setSaved('error');
      setTimeout(() => setSaved(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground">API Configuration</h3>
        <p className="text-xs text-muted-foreground mt-1">Manage your provider API keys and view usage statistics.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 border border-border rounded-lg p-0.5">
          {subTabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-1 text-xs font-medium rounded-[6px] transition-all duration-150 ${
                  isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <HugeiconsIcon icon={tab.icon} size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>
        {activeSubTab === 'keys' && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveKeys}
              disabled={saving}
              className="px-4 py-1 text-xs font-semibold bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Save Keys'}
            </button>
            {saved === 'saved' && (
              <span className="text-xs text-green-500 font-medium">Saved!</span>
            )}
            {saved === 'error' && (
              <span className="text-xs text-red-500 font-medium">Save failed</span>
            )}
          </div>
        )}
      </div>

      {activeSubTab === 'keys' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-[8px] border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
            Enter your API keys for the providers you wish to use. Keys are stored locally and never sent anywhere
            except to the provider directly.
          </p>
        </div>
      )}

      <div>
        {activeSubTab === 'overview' && <OverviewTab />}
        {activeSubTab === 'keys' && <KeysTab ref={keysTabRef} />}
      </div>
    </div>
  );
}
