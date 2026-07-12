import { useState, useEffect, useCallback } from 'react';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { DatabaseService } from '@core/utils/DatabaseService';
import { useSettingsConfig } from '@/hooks/useSettingsConfig';

interface OAuthConnectorTabProps {
  provider: string;
  label: string;
  description: string;
  envHint?: string;
}

export function OAuthConnectorTab({ provider, label, description, envHint }: OAuthConnectorTabProps) {
  const idKey = `${provider}-client-id`;
  const secretKey = `${provider}-client-secret`;
  const { config, setConfig, loaded, isSaving, save: handleSave } = useSettingsConfig([idKey, secretKey]);
  const [connected, setConnected] = useState(false);
  const [identity, setIdentity] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:3001/connector/${provider}/status`, { method: 'POST' });
      const data = await res.json();
      setConnected(data.connected);
      setIdentity(data.identity);
    } catch { /* ignore */ }
  }, [provider]);

  const handleConnect = async () => {
    if (!config[idKey]) return;
    setIsAuthenticating(true);

    try {
      await Promise.all(
        Object.entries(config).map(([key, value]) =>
          DatabaseService.setConfig(key, value)
        )
      );

      const res = await fetch(`http://localhost:3001/connector/${provider}/auth-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: config[idKey] }),
      });
      const { url } = await res.json();
      const popup = window.open(url, `${provider}-oauth`, 'width=500,height=600');

      const poll = setInterval(async () => {
        try {
          if (popup?.closed) {
            clearInterval(poll);
            setIsAuthenticating(false);
            await checkStatus();
          }
        } catch { /* ignore */ }
      }, 1000);
    } catch (err) {
      console.error(`${label} auth error:`, err);
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    await fetch(`http://localhost:3001/connector/${provider}/disconnect`, { method: 'POST' });
    setConnected(false);
    setIdentity(null);
  };

  useEffect(() => {
    if (loaded) checkStatus();
  }, [loaded, checkStatus]);

  if (!loaded) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="bg-muted/50 p-3 rounded-lg border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
          {envHint && (
            <span className="block mt-1 text-[11px] text-muted-foreground/60">
              Tip: You can also set {envHint} in your .env file instead.
            </span>
          )}
        </p>
      </div>

      {connected && identity && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-900/20 border border-green-800">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-green-400" />
          <span className="text-sm text-green-400">Connected as <strong>{identity}</strong></span>
        </div>
      )}

      {!connected && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
          <HugeiconsIcon icon={Cancel01Icon} size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Not connected</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Client ID</label>
        <PasswordInput
          value={config[idKey] || ''}
          onChange={(v) => setConfig(p => ({ ...p, [idKey]: v }))}
          placeholder={`Enter ${label} OAuth Client ID`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Client Secret</label>
        <PasswordInput
          value={config[secretKey] || ''}
          onChange={(v) => setConfig(p => ({ ...p, [secretKey]: v }))}
          placeholder={`Enter ${label} OAuth Client Secret`}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="mt-4 px-5 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-all flex items-center gap-2 active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : null}
          Save
        </button>

        {connected ? (
          <button
            onClick={handleDisconnect}
            className="mt-4 px-5 py-2 text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all active:scale-[0.98]"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isAuthenticating || !config[idKey]}
            className="mt-4 px-5 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-all flex items-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {isAuthenticating ? <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : null}
            Connect {label}
          </button>
        )}
      </div>
    </div>
  );
}
