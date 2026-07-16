import { useState, useEffect, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { API_BASE_URL } from '@/lib/api';

export function TelegramTab() {
  const [connected, setConnected] = useState(false);
  const [identity, setIdentity] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/connector/telegram/status`, { method: 'POST' });
      const data = await res.json();
      setConnected(data.connected);
      setIdentity(data.identity);
    } catch (e) { console.warn('Telegram status check failed:', e); }
  }, []);

  const handleConnect = async () => {
    if (!token.trim()) return;
    setIsConnecting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/connector/telegram/set-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      if (res.ok) {
        await checkStatus();
      } else {
        const err = await res.json();
        alert(`Connection failed: ${err.error || 'Invalid token'}`);
      }
    } catch (err) {
      console.error('Telegram connect error:', err);
      alert('Connection failed. Check the token and try again.');
    }
    setIsConnecting(false);
  };

  const handleDisconnect = async () => {
    await fetch(`${API_BASE_URL}/connector/telegram/disconnect`, { method: 'POST' });
    setConnected(false);
    setIdentity(null);
    setToken('');
  };

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return (
    <div className="space-y-5">
      <div className="bg-muted/50 p-3 rounded-lg border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Connect your Telegram bot. Create a bot via <strong>@BotFather</strong> on Telegram to get a bot token.
          The token looks like <code className="text-[11px] bg-muted px-1 py-0.5 rounded">123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11</code>.
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

      {!connected && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Bot Token</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter Telegram Bot Token from @BotFather"
            className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-border">
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
            disabled={isConnecting || !token.trim()}
            className="mt-4 px-5 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-all flex items-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {isConnecting ? <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : null}
            Connect Telegram
          </button>
        )}
      </div>
    </div>
  );
}
