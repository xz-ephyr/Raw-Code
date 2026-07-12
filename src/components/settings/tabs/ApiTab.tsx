import { useState, useRef, useEffect } from 'react';
import { Activity01Icon, Key01Icon } from '@hugeicons/core-free-icons';
import { SubTabNav } from '@/components/settings/SubTabNav';
import { OverviewTab } from './OverviewTab';
import { KeysTab, type KeysTabHandle } from './KeysTab';

const subTabs = [
  { id: 'overview', label: 'Overview', icon: Activity01Icon },
  { id: 'keys', label: 'Keys', icon: Key01Icon },
] as const;

type SubTabId = (typeof subTabs)[number]['id'];

export function ApiTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('overview');
  const keysTabRef = useRef<KeysTabHandle | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<'saved' | 'error' | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

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
      savedTimeoutRef.current = setTimeout(() => setSaved(null), 2000);
    } catch {
      setSaved('error');
      savedTimeoutRef.current = setTimeout(() => setSaved(null), 3000);
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
        <SubTabNav tabs={subTabs} activeId={activeSubTab} onChange={(id) => setActiveSubTab(id as SubTabId)} />
        {activeSubTab === 'keys' && (
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSaveKeys}
              disabled={saving}
              className="px-4 py-1 text-xs font-semibold bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
            >
              {saving && (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              {saving ? 'Saving...' : 'Save Keys'}
            </button>
            {saved === 'saved' && (
              <span className="text-xs text-green-500 font-medium animate-in fade-in duration-200">Saved!</span>
            )}
            {saved === 'error' && (
              <span className="text-xs text-red-500 font-medium animate-in fade-in duration-200">Save failed</span>
            )}
          </div>
        )}
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
        {activeSubTab === 'keys' && (
          <KeysTab ref={keysTabRef} />
        )}
      </div>
    </div>
  );
}
