import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ViewIcon, ViewOffSlashIcon, Key01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { getAllProviders } from '@core/providers';
import { DatabaseService } from '@core/utils/DatabaseService';
import { refreshProviders } from '@core/models/aiService';

export interface KeysTabHandle {
  save: () => Promise<void>;
}

export const KeysTab = forwardRef<KeysTabHandle>((_, ref) => {
  const providers = getAllProviders().filter(p => p.id !== 'omniroute');
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [cloudflareAccountId, setCloudflareAccountId] = useState('');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const initial: Record<string, string> = {};
      for (const p of providers) {
        initial[p.id] = await DatabaseService.getConfig(p.configKey)
          .then(r => r || localStorage.getItem(p.configKey) || '');
      }
      setKeys(initial);

      const cfAccount = await DatabaseService.getConfig('cloudflare-account-id')
        .then(r => r || localStorage.getItem('cloudflare-account-id') || '');
      setCloudflareAccountId(cfAccount);
    })();
  }, []);

  useImperativeHandle(ref, () => ({
    save: async () => {
      await Promise.allSettled(providers.map((p) =>
        DatabaseService.setConfig(p.configKey, keys[p.id])
      ));
      providers.forEach((p) => {
        localStorage.setItem(p.configKey, keys[p.id]);
      });

      if (cloudflareAccountId) {
        await DatabaseService.setConfig('cloudflare-account-id', cloudflareAccountId).catch(() => {});
        localStorage.setItem('cloudflare-account-id', cloudflareAccountId);

        const cfBaseURL = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/v1`;
        await DatabaseService.setConfig('cloudflare-base-url', cfBaseURL).catch(() => {});
        localStorage.setItem('cloudflare-base-url', cfBaseURL);
      }

      refreshProviders();
    },
  }));

  return (
    <div className="grid grid-cols-2 gap-3">
      {providers.map((p) => (
        <div key={p.id} className="p-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <img src={p.icon} alt={p.label} className="shrink-0" style={{ width: 22, height: 22 }} />
            <span className="text-sm font-semibold text-foreground">{p.label}</span>
            {keys[p.id]?.trim() && (
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} className="text-green-500" />
            )}
          </div>
          <div className="relative">
            <div className="absolute left-2.5 top-2 text-muted-foreground">
              <HugeiconsIcon icon={Key01Icon} size={13} />
            </div>
            <input
              type={showKeys[p.id] ? 'text' : 'password'}
              value={keys[p.id] || ''}
              onChange={(e) => setKeys({ ...keys, [p.id]: e.target.value })}
              placeholder={`Enter ${p.label} API Key`}
              className="h-8 bg-muted rounded-[6px] pl-8 pr-9 outline-none text-xs w-full border border-border focus:border-ring transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowKeys({ ...showKeys, [p.id]: !showKeys[p.id] })}
              className="absolute right-2 top-1 text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={showKeys[p.id] ? ViewOffSlashIcon : ViewIcon} size={14} />
            </button>
          </div>

          {p.id === 'cloudflare' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Account ID (required for Cloudflare)</label>
              <input
                type="text"
                value={cloudflareAccountId}
                onChange={(e) => setCloudflareAccountId(e.target.value)}
                placeholder="Enter your Cloudflare Account ID"
                className="h-8 bg-muted rounded-lg px-3 outline-none text-xs w-full border border-border focus:border-ring transition-colors"
              />
              <p className="text-[10px] text-muted-foreground">Find this in your Cloudflare dashboard URL or in My Profile → API Tokens.</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

KeysTab.displayName = 'KeysTab';
