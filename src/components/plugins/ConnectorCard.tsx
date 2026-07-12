import { HugeiconsIcon } from '@hugeicons/react';
import { StarIcon, Download01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';

interface ConnectorCardProps {
  label: string;
  description: string;
  icon?: any;
  imageSrc?: string;
  imageSrcDark?: string;
  type?: 'connector' | 'mcp' | 'skill';
  stars?: number;
  connected?: boolean;
  onAction?: () => void;
  onClick?: () => void;
}

export const ConnectorCard = ({ label, description, icon, imageSrc, imageSrcDark, type = 'connector', stars, connected, onAction, onClick }: ConnectorCardProps) => (
  <button
    onClick={onClick}
    className="h-[80px] border border-border rounded-lg p-3 flex flex-col text-left hover:bg-muted transition-colors cursor-pointer relative"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {imageSrc ? (
          <>
            {imageSrcDark ? (
              <>
                <img src={imageSrc} alt={label} className="w-5 h-5 shrink-0 dark:hidden" />
                <img src={imageSrcDark} alt={label} className="w-5 h-5 shrink-0 hidden dark:block" />
              </>
            ) : (
              <img src={imageSrc} alt={label} className="w-5 h-5 shrink-0" />
            )}
          </>
        ) : icon ? (
          <HugeiconsIcon icon={icon} size={18} className="text-muted-foreground shrink-0" />
        ) : null}
        <span className="text-xs font-semibold text-foreground truncate">{label}</span>
      </div>
      {connected ? (
        <span className="flex items-center gap-1 text-[11px] font-medium text-green-500 shrink-0">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
          Connected
        </span>
      ) : (
        <span
          onClick={(e) => { e.stopPropagation(); onAction?.(); onClick?.(); }}
          className="flex items-center justify-center w-7 h-7 rounded-md bg-muted hover:bg-muted/80 transition-colors shrink-0"
          title={type === 'connector' ? 'Connect' : 'Install'}
        >
          <HugeiconsIcon icon={Download01Icon} size={14} className="text-foreground" />
        </span>
      )}
    </div>
    {type !== 'connector' && stars !== undefined && (
      <div className="flex items-center gap-0.5 mt-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <HugeiconsIcon
            key={i}
            icon={StarIcon}
            size={10}
            className={i < stars ? 'text-yellow-500' : 'text-muted-foreground/30'}
          />
        ))}
      </div>
    )}
    <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-1">{description}</p>
  </button>
);
