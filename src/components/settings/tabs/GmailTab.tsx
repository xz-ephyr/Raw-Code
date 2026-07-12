import { useState, useEffect, useCallback } from 'react';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { DatabaseService } from '@core/utils/DatabaseService';
import { useSettingsConfig } from '@/hooks/useSettingsConfig';

export function GmailTab() {
  const { config, setConfig, loaded, isSaving, save: handleSave } = useSettingsConfig(['gmail-client-id', 'gmail-client-secret']);
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [didAutoConnect, setDidAutoConnect] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/gmail/status', { method: 'POST' });
      const data = await res.json();
      setConnected(data.connected);
      setEmail(data.email);
    } catch { /* ignore */ }
  }, []);

  const handleConnectWithId = useCallback(async (clientId: string) => {
    setIsAuthenticating(true);
    try {
      const res = await fetch('http://localhost:3001/gmail/auth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      const { url } = await res.json();
      const popup = window.open(url, 'gmail-oauth', 'width=500,height=600');
      const poll = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(poll);
          setIsAuthenticating(false);
          await checkStatus();
        }
      }, 1000);
    } catch (err) {
      console.error('Gmail auth error:', err);
      setIsAuthenticating(false);
    }
  }, [checkStatus]);

  useEffect(() => {
    if (!loaded || didAutoConnect) return;
    const pending = sessionStorage.getItem('gmail-pending-connect');
    if (pending && config['gmail-client-id']) {
      sessionStorage.removeItem('gmail-pending-connect');
      setDidAutoConnect(true);
      setTimeout(() => handleConnectWithId(config['gmail-client-id']), 500);
    }
  }, [loaded, didAutoConnect, config, handleConnectWithId]);

  useEffect(() => {
    if (loaded) checkStatus();
  }, [loaded, checkStatus]);

  const handleConnect = async () => {
    if (!config['gmail-client-id']) return;
    setIsAuthenticating(true);

    try {
      // Save credentials first
      await Promise.all(
        Object.entries(config).map(([key, value]) =>
          DatabaseService.setConfig(key, value)
        )
      );

      // Get auth URL
      const res = await fetch('http://localhost:3001/gmail/auth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: config['gmail-client-id'] }),
      });
      const { url } = await res.json();

      // Open popup for OAuth
      const popup = window.open(url, 'gmail-oauth', 'width=500,height=600');

      // Poll for callback
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
      console.error('Gmail auth error:', err);
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    await fetch('http://localhost:3001/gmail/disconnect', { method: 'POST' });
    setConnected(false);
    setEmail(null);
  };

  if (!loaded) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="bg-red-900/20 p-3 rounded-lg border border-red-800">
        <p className="text-xs text-red-400 leading-relaxed">
          Connect your Gmail account to let the AI read and send emails on your behalf.
          You'll need a Google Cloud project with Gmail API enabled.
        </p>
      </div>

      {connected && email && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-900/20 border border-green-800">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-green-400" />
          <span className="text-sm text-green-400">Connected as <strong>{email}</strong></span>
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
          value={config['gmail-client-id'] || ''}
          onChange={(v) => setConfig(p => ({ ...p, 'gmail-client-id': v }))}
          placeholder="Enter Google OAuth Client ID"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Client Secret</label>
        <PasswordInput
          value={config['gmail-client-secret'] || ''}
          onChange={(v) => setConfig(p => ({ ...p, 'gmail-client-secret': v }))}
          placeholder="Enter Google OAuth Client Secret"
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
            disabled={isAuthenticating || !config['gmail-client-id']}
            className="mt-4 px-5 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-all flex items-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {isAuthenticating ? <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : null}
            Connect Gmail
          </button>
        )}
      </div>
    </div>
  );
}
