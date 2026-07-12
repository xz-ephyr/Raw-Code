import { useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';
import { SettingsSection } from '@/components/settings/SettingsSection';

export function StorageTab() {
  const { confirmAsync } = useToast();

  const storageStats = useMemo(() => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    const totalBytes = keys.reduce((acc, k) => acc + new Blob([localStorage.getItem(k) || '']).size, 0);
    const totalKB = (totalBytes / 1024).toFixed(1);
    return { itemCount: keys.length, totalKB };
  }, []);

  const handleExport = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) data[key] = localStorage.getItem(key) || '';
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raw-code-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SettingsSection title="Local Database" description="Your projects, chats, and messages are stored locally in SQLite. This data never leaves your machine.">
        <div className="bg-muted p-4 rounded-xl border border-border grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Stored Items</p>
            <p className="text-lg font-bold text-foreground">{storageStats.itemCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estimated Size</p>
            <p className="text-lg font-bold text-foreground">{storageStats.totalKB} KB</p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Data Management" description="Export, clear, or reset your local data.">
        <div className="flex flex-col gap-3">
          <button
            onClick={handleExport}
            className="w-full px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent rounded-lg transition-colors text-left"
          >
            Export All Data
          </button>

          <button
            onClick={async () => {
              if (await confirmAsync('Clear all chat history? This cannot be undone.')) {
                if (await confirmAsync('Are you sure? All messages and sessions will be permanently deleted.')) {
                  const keysToRemove = ['chat_sessions', 'project_chat_sessions', 'projects'];
                  keysToRemove.forEach(k => localStorage.removeItem(k));
                }
              }
            }}
            className="w-full px-4 py-2.5 text-sm font-semibold text-red-400 bg-red-900/20 hover:bg-red-900/30 rounded-xl transition-colors text-left"
          >
            Clear Chat History
          </button>

          <button
            onClick={async () => {
              if (await confirmAsync('Reset onboarding tour? You will see the welcome screens again on next launch.')) {
                localStorage.removeItem('onboarding_completed');
              }
            }}
            className="w-full px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent rounded-lg transition-colors text-left"
          >
            Reset Onboarding
          </button>
        </div>
      </SettingsSection>
    </div>
  );
}
