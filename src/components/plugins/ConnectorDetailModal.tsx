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

const BRAND_ACCENTS: Record<string, { from: string; to: string; ring: string }> = {
  Gmail: { from: 'from-red-500', to: 'to-red-600', ring: 'ring-red-500/30' },
  GitHub: { from: 'from-gray-600', to: 'to-gray-800', ring: 'ring-gray-500/30' },
  YouTube: { from: 'from-red-600', to: 'to-red-700', ring: 'ring-red-600/30' },
  Telegram: { from: 'from-blue-500', to: 'to-blue-600', ring: 'ring-blue-500/30' },
  Reddit: { from: 'from-orange-500', to: 'to-orange-600', ring: 'ring-orange-500/30' },
  Twitter: { from: 'from-sky-500', to: 'to-sky-600', ring: 'ring-sky-500/30' },
};

function getAccent(label: string) {
  return BRAND_ACCENTS[label] || { from: 'from-primary', to: 'to-primary/80', ring: 'ring-primary/30' };
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

  const accent = getAccent(label);

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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in duration-200 ease-out">
        <div className="bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">

          {/* Header gradient */}
          <div className={`h-2 bg-gradient-to-r ${accent.from} ${accent.to}`} />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-muted/80 hover:bg-muted transition-colors z-10"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} className="text-muted-foreground" />
          </button>

          <div className="px-7 pt-7 pb-6 space-y-6">
            {/* Icon + Label */}
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${accent.from} ${accent.to} flex items-center justify-center shadow-lg shrink-0 ${accent.ring} ring-2`}>
                {imageSrc ? (
                  <img src={imageSrc} alt={label} className="w-7 h-7 brightness-0 invert" />
                ) : icon ? (
                  <HugeiconsIcon icon={icon} size={24} className="text-white" />
                ) : null}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{label}</h2>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {type === 'connector' ? 'Connector' : type === 'mcp' ? 'MCP Server' : 'Skill'}
                </span>
              </div>
            </div>

            {/* States */}
            {view === 'info' && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                <button
                  onClick={handleConnect}
                  disabled={connected}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {type === 'connector' ? 'Connect' : 'Install'}
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                </button>
              </div>
            )}

            {view === 'credentials' && authType === 'oauth2' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Enter your OAuth credentials to connect. These are saved locally and used only for this connection.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Client ID</label>
                    <input
                      value={clientId}
                      onChange={e => setClientId(e.target.value)}
                      placeholder="Paste your Client ID"
                      className="w-full px-3.5 py-2.5 text-sm bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Client Secret</label>
                    <input
                      type="password"
                      value={clientSecret}
                      onChange={e => setClientSecret(e.target.value)}
                      placeholder="Paste your Client Secret"
                      className="w-full px-3.5 py-2.5 text-sm bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={!clientId || !clientSecret}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40"
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
                    className="w-full px-3.5 py-2.5 text-sm bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all font-mono"
                  />
                </div>
                <button
                  onClick={handleConnect}
                  disabled={!token.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  Save & Connect
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                </button>
              </div>
            )}

            {view === 'connecting' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <HugeiconsIcon icon={Loading03Icon} size={24} className="text-foreground animate-spin" />
                </div>
                <p className="text-sm font-medium text-foreground">Connecting {label}...</p>
                <p className="text-xs text-muted-foreground">Completing authentication in the popup window</p>
              </div>
            )}

            {view === 'connected' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${accent.from} ${accent.to} flex items-center justify-center shadow-lg`}>
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={28} className="text-white" />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-foreground">{label} Connected</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Your AI can now interact with {label}</p>
                </div>
                <button
                  onClick={onClose}
                  className="mt-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-all active:scale-[0.98]"
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
