import { forwardRef, useImperativeHandle } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { refreshProviders } from '@core/models/aiService';
import { DatabaseService } from '@core/utils/DatabaseService';
import { useProviderKeys } from '@/hooks/useProviderKeys';
import { PasswordInput } from '@/components/ui/PasswordInput';

export interface KeysTabHandle {
  save: () => Promise<void>;
}

export const KeysTab = forwardRef<KeysTabHandle>((_, ref) => {
  const { providers, keys, setKeys, extras, setExtraValue } = useProviderKeys([
    { key: 'cloudflare-account-id', storageKey: 'cloudflare-account-id' },
  ]);

  const filteredProviders = providers.filter(p => p.id !== 'omniroute');

  useImperativeHandle(ref, () => ({
    save: async () => {
      await Promise.allSettled(filteredProviders.map((p) =>
        DatabaseService.setConfig(p.configKey, keys[p.id])
      ));
      filteredProviders.forEach((p) => {
        localStorage.setItem(p.configKey, keys[p.id]);
      });

      const cfAccountId = extras['cloudflare-account-id'];
      if (cfAccountId) {
        await DatabaseService.setConfig('cloudflare-account-id', cfAccountId).catch(() => {});
        localStorage.setItem('cloudflare-account-id', cfAccountId);

        const cfBaseURL = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/v1`;
        await DatabaseService.setConfig('cloudflare-base-url', cfBaseURL).catch(() => {});
        localStorage.setItem('cloudflare-base-url', cfBaseURL);
      }

      refreshProviders();
    },
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {filteredProviders.map((p) => (
        <div key={p.id} className="p-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <img src={p.icon} alt={p.label} className="shrink-0" style={{ width: 22, height: 22 }} />
            <span className="text-sm font-semibold text-foreground">{p.label}</span>
            {keys[p.id]?.trim() && (
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} className="text-green-500" />
            )}
          </div>
          <PasswordInput
            value={keys[p.id] || ''}
            onChange={(v) => setKeys({ ...keys, [p.id]: v })}
            placeholder={`Enter ${p.label} API Key`}
            showKeyIcon
          />

          {p.id === 'cloudflare' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Account ID (required for Cloudflare)</label>
              <input
                type="text"
                value={extras['cloudflare-account-id'] || ''}
                onChange={(e) => setExtraValue('cloudflare-account-id', e.target.value)}
                placeholder="Enter your Cloudflare Account ID"
                className="h-9 bg-muted rounded-lg px-3 outline-none text-sm w-full border border-border focus:border-ring transition-colors"
              />
              <p className="text-xs text-muted-foreground">Find this in your Cloudflare dashboard URL or in My Profile → API Tokens.</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

KeysTab.displayName = 'KeysTab';
