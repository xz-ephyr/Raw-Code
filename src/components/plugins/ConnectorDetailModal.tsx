import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, StarIcon, CheckmarkCircle02Icon, ArrowTurnBackwardIcon } from '@hugeicons/core-free-icons';

interface ConnectorDetailModalProps {
  label: string;
  description: string;
  icon?: any;
  imageSrc?: string;
  type?: 'connector' | 'mcp' | 'skill';
  stars?: number;
  details: string[];
  isOpen: boolean;
  connected?: boolean;
  onClose: () => void;
  onAction?: () => void;
  onClientIdSubmit?: (clientId: string) => void;
}

const headerBg: Record<string, string> = {
  connectors: 'bg-amber-500/10',
  mcp: 'bg-blue-500/10',
  skills: 'bg-green-500/10',
};

const badgeColors: Record<string, string> = {
  connectors: 'bg-amber-500/20 text-amber-500',
  mcp: 'bg-blue-500/20 text-blue-500',
  skills: 'bg-green-500/20 text-green-500',
};

export const ConnectorDetailModal = ({ label, description, icon, imageSrc, type = 'connector', stars, details, isOpen, connected, onClose, onAction, onClientIdSubmit }: ConnectorDetailModalProps) => {
  const [showSetup, setShowSetup] = useState(false);
  const [clientId, setClientId] = useState('');

  if (!isOpen) return null;

  const handleConnect = () => {
    if (connected) return;
    if (onClientIdSubmit) {
      setShowSetup(true);
    } else if (onAction) {
      onAction();
    }
  };

  const handleSubmitClientId = () => {
    if (!clientId.trim() || !onClientIdSubmit) return;
    onClientIdSubmit(clientId.trim());
    setClientId('');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden transition-all duration-300 ease-out"
        style={{ width: showSetup ? 'min(780px, 95vw)' : 'min(420px, 95vw)', minHeight: showSetup ? '400px' : '380px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex overflow-hidden">
          {/* Main panel */}
          <div className={`flex flex-col transition-all duration-300 ${showSetup ? 'w-[420px] shrink-0' : 'w-full'}`}>
            <div className={`relative ${headerBg[type]} px-5 pt-5 pb-4`}>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} />
              </button>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  {imageSrc ? (
                    <img src={imageSrc} alt={label} className="w-7 h-7" />
                  ) : icon ? (
                    <HugeiconsIcon icon={icon} size={24} className="text-foreground" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">{label}</h2>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md ${badgeColors[type]}`}>
                      {type === 'connector' ? 'Connector' : type === 'mcp' ? 'MCP Server' : 'Skill'}
                    </span>
                  </div>
                  {type !== 'connector' && stars !== undefined && (
                    <div className="flex items-center gap-0.5 mt-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <HugeiconsIcon
                          key={i}
                          icon={StarIcon}
                          size={13}
                          className={i < stars ? 'text-yellow-500' : 'text-muted-foreground/30'}
                        />
                      ))}
                      <span className="text-[11px] text-muted-foreground ml-1.5">{stars}/5</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4 flex-1">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Features</p>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  {details.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="text-muted-foreground shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 shrink-0 flex justify-end">
              <button
                onClick={handleConnect}
                className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  connected
                    ? 'bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25'
                    : 'bg-foreground text-background hover:opacity-90'
                }`}
              >
                {connected ? 'Connected' : type === 'connector' ? 'Connect' : 'Install'}
              </button>
            </div>
          </div>

          {/* Slide-out setup panel */}
          <div
            className={`border-l border-border bg-card overflow-hidden transition-all duration-300 ease-out ${
              showSetup ? 'w-[290px] opacity-100' : 'w-0 opacity-0'
            }`}
          >
            <div className="p-4 h-full flex flex-col min-h-[380px]">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setShowSetup(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={14} />
                </button>
                <h3 className="text-sm font-bold text-foreground">Setup</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Enter your Google Cloud OAuth Client ID. Create one at{' '}
                <a
                  href="https://console.cloud.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 dark:text-blue-400 font-medium hover:underline underline-offset-2"
                >
                  console.cloud.google.com
                </a>
              </p>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitClientId()}
                placeholder="Client ID"
                className="w-full h-9 bg-muted rounded-lg px-3 text-xs outline-none border border-border focus:border-ring transition-colors"
                autoFocus
              />
              <div className="mt-auto pt-4">
                <button
                  onClick={handleSubmitClientId}
                  disabled={!clientId.trim()}
                  className="w-full px-4 py-2 text-sm font-semibold bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
