import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, StarIcon, CheckmarkCircle02Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

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
  authType?: 'oauth2' | 'token';
  onClose: () => void;
  onAction?: () => void;
  onSetToken?: (token: string) => void;
}

const badgeColors: Record<string, string> = {
  connectors: 'bg-amber-500/20 text-amber-500',
  mcp: 'bg-blue-500/20 text-blue-500',
  skills: 'bg-green-500/20 text-green-500',
};

export const ConnectorDetailModal = ({ label, description, icon, imageSrc, type = 'connector', stars, details, isOpen, connected, authType, onClose, onAction, onSetToken }: ConnectorDetailModalProps) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[380px] max-w-[95vw] bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              {imageSrc ? (
                <img src={imageSrc} alt={label} className="w-6 h-6" />
              ) : icon ? (
                <HugeiconsIcon icon={icon} size={20} className="text-foreground" />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground truncate">{label}</h2>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${badgeColors[type]}`}>
                  {type === 'connector' ? 'Connector' : type === 'mcp' ? 'MCP' : 'Skill'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

          {type !== 'connector' && stars !== undefined && (
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <HugeiconsIcon
                  key={i}
                  icon={StarIcon}
                  size={14}
                  className={i < stars ? 'text-yellow-500' : 'text-muted-foreground/30'}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">{stars}/5</span>
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Features</p>
            <div className="space-y-2.5">
              {details.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} className="text-muted-foreground shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border shrink-0 space-y-3">
          {authType === 'token' && !connected && onSetToken && (
            <div>
              <input
                type="password"
                placeholder={`Enter ${label} Bot Token`}
                className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring mb-2"
                onChange={(e) => {
                  const token = e.target.value.trim();
                  (e.target as any)._token = token;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const token = (e.target as any)._token || (e.target as HTMLInputElement).value.trim();
                    if (token) onSetToken(token);
                  }
                }}
              />
            </div>
          )}
          <button
            onClick={onAction}
            disabled={connected}
            className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
              connected
                ? 'bg-green-500/15 text-green-600 dark:text-green-400 cursor-default'
                : 'bg-foreground text-background hover:opacity-90'
            }`}
          >
            {connected ? (
              <>
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
                Connected
              </>
            ) : (
              <>
                {type === 'connector' ? 'Connect' : 'Install'}
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};
