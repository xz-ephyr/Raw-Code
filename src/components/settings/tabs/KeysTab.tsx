import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { refreshProviders } from '@core/models/aiService';
import { DatabaseService } from '@core/utils/DatabaseService';
import { useProviderKeys } from '@/hooks/useProviderKeys';
import { ProviderKeyModal } from '@/components/settings/ProviderKeyModal';
import type { KeyProvider } from '@core/providers/providerRegistry';

export function KeysTab() {
  const { providers, keys, setKeys } = useProviderKeys();

  const [selectedProvider, setSelectedProvider] = useState<KeyProvider | null>(null);
  const filteredProviders = providers;

  const handleSaveProviderKey = useCallback(async (providerId: string, key: string) => {
    const p = providers.find(pr => pr.id === providerId);
    if (!p) return;

    setKeys(prev => ({ ...prev, [providerId]: key }));

    await DatabaseService.setConfig(p.configKey, key).catch((e) => console.error('Failed to save provider key:', e));
    localStorage.setItem(p.configKey, key);

    await refreshProviders();
  }, [providers, setKeys]);

  return (
    <>
      <div className="space-y-2">
        {filteredProviders.map((p) => {
          const hasKey = !!keys[p.id]?.trim();
          return (
            <div
              key={p.id}
              className="flex items-center justify-between px-4 py-3 rounded-md border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={p.icon}
                  alt={p.label}
                  className="shrink-0"
                  style={{ width: 22, height: 22 }}
                />
                <span className="text-sm font-medium text-foreground truncate">{p.label}</span>
              </div>
              <button
                onClick={() => setSelectedProvider(p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-[0.97] shrink-0 ${
                  hasKey
                    ? 'bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25'
                    : 'bg-accent text-accent-foreground hover:opacity-80'
                }`}
              >
                {hasKey ? 'Connected' : 'Connect'}
                {!hasKey && <Plus size={13} />}
              </button>
            </div>
          );
        })}
      </div>

      {selectedProvider && (
        <ProviderKeyModal
          provider={selectedProvider}
          currentKey={keys[selectedProvider.id] || ''}
          isOpen={!!selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onSave={async (key) => {
            await handleSaveProviderKey(selectedProvider.id, key);
            setSelectedProvider(null);
          }}
        />
      )}
    </>
  );
}
