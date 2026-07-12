import { useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { HugeiconsIcon } from '@hugeicons/react';
import { DatabaseIcon, DownloadSquare01Icon, Delete02Icon, RefreshIcon, AlertCircleIcon } from '@hugeicons/core-free-icons';

export function StorageTab() {
  const { confirmAsync } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  const storageStats = useMemo(() => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    const totalBytes = keys.reduce((acc, k) => acc + new Blob([localStorage.getItem(k) || '']).size, 0);
    const totalKB = (totalBytes / 1024).toFixed(1);
    const usagePercent = Math.min(100, (totalBytes / (5 * 1024 * 1024)) * 100);
    return { itemCount: keys.length, totalKB, usagePercent };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

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
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">Storage Overview</h3>
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <HugeiconsIcon icon={DatabaseIcon} size={22} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Local Storage</p>
              <p className="text-xs text-muted-foreground">Your data is stored locally and never leaves your device</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Items Stored</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{storageStats.itemCount}</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total Size</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{storageStats.totalKB} KB</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Usage</span>
              <span>{storageStats.usagePercent.toFixed(1)}% of ~5 MB</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${Math.min(storageStats.usagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <h3 className="text-sm font-bold text-foreground mb-3">Data Actions</h3>
        <div className="space-y-2">
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/30 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <HugeiconsIcon icon={DownloadSquare01Icon} size={16} className="text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Export All Data</p>
              <p className="text-xs text-muted-foreground">Download a JSON backup of all settings and data</p>
            </div>
          </button>

          <button
            onClick={async () => {
              if (await confirmAsync('Reset onboarding tour? You will see the welcome screens again on next launch.')) {
                localStorage.removeItem('onboarding_completed');
                setRefreshKey(k => k + 1);
              }
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/30 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <HugeiconsIcon icon={RefreshIcon} size={16} className="text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Reset Onboarding</p>
              <p className="text-xs text-muted-foreground">Replay the welcome tour on next launch</p>
            </div>
          </button>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <div className="flex items-center gap-2 mb-3">
          <HugeiconsIcon icon={AlertCircleIcon} size={14} className="text-red-500" />
          <h3 className="text-sm font-bold text-red-500">Danger Zone</h3>
        </div>
        <div className="rounded-xl border border-red-900/30 bg-red-900/5 p-4">
          <button
            onClick={async () => {
              if (await confirmAsync('Clear all chat history? This cannot be undone.')) {
                if (await confirmAsync('Are you sure? All messages and sessions will be permanently deleted.')) {
                  const keysToRemove = ['chat_sessions', 'project_chat_sessions', 'projects'];
                  keysToRemove.forEach(k => localStorage.removeItem(k));
                  setRefreshKey(k => k + 1);
                }
              }
            }}
            className="w-full flex items-center gap-3 text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
              <HugeiconsIcon icon={Delete02Icon} size={16} className="text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-400">Clear Chat History</p>
              <p className="text-xs text-red-400/60">Permanently delete all messages and sessions</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
