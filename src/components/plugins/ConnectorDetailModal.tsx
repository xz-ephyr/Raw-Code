import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, CheckmarkCircle02Icon, ArrowRight01Icon, Loading03Icon } from '@hugeicons/core-free-icons';

type ConnectorView = 'info' | 'credentials' | 'connecting' | 'connected';

interface ConnectorDetailModalProps {
  label: string;
  description: string;
  icon?: any;
  imageSrc?: string;
  type?: 'connector' | 'mcp' | 'skill';
  isOpen: boolean;
  connected?: boolean;
  authType?: 'oauth2' | 'token';
  onClose: () => void;
  onSetToken?: (token: string) => Promise<void>;
  onSetCredentials?: (clientId: string, clientSecret: string) => Promise<void>;
}

export const ConnectorDetailModal = ({
  label, description, icon, imageSrc, type = 'connector',
  isOpen, connected, authType,
  onClose, onSetToken, onSetCredentials,
}: ConnectorDetailModalProps) => {
  const [view, setView] = useState<ConnectorView>(connected ? 'connected' : 'info');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    if (isOpen) {
      setView(connected ? 'connected' : 'info');
      setClientId('');
      setClientSecret('');
      setToken('');
    }
  }, [isOpen, connected]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    if (authType === 'token') {
      if (!token.trim()) return;
      setView('connecting');
      try {
        await onSetToken?.(token.trim());
        setView('connected');
      } catch {
        setView('credentials');
      }
      return;
    }

    if (authType === 'oauth2') {
      if (!clientId || !clientSecret) {
        setView('credentials');
        return;
      }
      setView('connecting');
      try {
        await onSetCredentials?.(clientId.trim(), clientSecret.trim());
        setView('connected');
      } catch {
        setView('credentials');
      }
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in duration-200 ease-out">
        <div className="bg-sidebar border border-border/50 rounded-xl shadow-2xl overflow-hidden">

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors z-10"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={13} className="text-muted-foreground" />
          </button>

          <div className="px-6 pt-6 pb-5 space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {imageSrc ? (
                  <img src={imageSrc} alt={label} loading="lazy" className="w-6 h-6" />
                ) : icon ? (
                  <HugeiconsIcon icon={icon} size={20} className="text-foreground" />
                ) : null}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">{label}</h2>
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  {type === 'connector' ? 'Connector' : type === 'mcp' ? 'MCP Server' : 'Skill'}
                </span>
              </div>
            </div>

            {view === 'info' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                <button
                  onClick={handleConnect}
                  disabled={connected}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg bg-foreground text-background hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {type === 'connector' ? 'Connect' : 'Install'}
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                </button>
              </div>
            )}

            {view === 'credentials' && authType === 'oauth2' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Enter your OAuth credentials to connect.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Client ID</label>
                    <input
                      value={clientId}
                      onChange={e => setClientId(e.target.value)}
                      placeholder="Paste your Client ID"
                      className="w-full px-3.5 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Client Secret</label>
                    <input
                      type="password"
                      value={clientSecret}
                      onChange={e => setClientSecret(e.target.value)}
                      placeholder="Paste your Client Secret"
                      className="w-full px-3.5 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={!clientId || !clientSecret}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg bg-foreground text-background hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  Save & Connect
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                </button>
              </div>
            )}

            {view === 'credentials' && authType === 'token' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Enter your Telegram bot token to connect.</p>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Bot Token</label>
                  <input
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                    className="w-full px-3.5 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all font-mono"
                  />
                </div>
                <button
                  onClick={handleConnect}
                  disabled={!token.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg bg-foreground text-background hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  Save & Connect
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                </button>
              </div>
            )}

            {view === 'connecting' && (
              <div className="flex flex-col items-center gap-3 py-5">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <HugeiconsIcon icon={Loading03Icon} size={20} className="text-foreground animate-spin" />
                </div>
                <p className="text-sm font-medium text-foreground">Connecting {label}...</p>
              </div>
            )}

            {view === 'connected' && (
              <div className="flex flex-col items-center gap-4 py-5">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={26} className="text-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-foreground">{label} Connected</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Your AI can now interact with {label}</p>
                </div>
                <button
                  onClick={onClose}
                  className="mt-1 px-6 py-2.5 text-sm font-semibold rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-all active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
