import { HugeiconsIcon } from '@hugeicons/react';
import { StarIcon } from '@hugeicons/core-free-icons';

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
    className="h-[135px] border border-border rounded-lg p-4 flex flex-col justify-between text-left hover:bg-muted transition-colors cursor-pointer"
  >
    <div>
      <div className="flex items-center gap-2">
        {imageSrc ? (
          <>
            {imageSrcDark ? (
              <>
                <img src={imageSrc} alt={label} className="w-6 h-6 dark:hidden" />
                <img src={imageSrcDark} alt={label} className="w-6 h-6 hidden dark:block" />
              </>
            ) : (
              <img src={imageSrc} alt={label} className="w-6 h-6" />
            )}
          </>
        ) : icon ? (
          <HugeiconsIcon icon={icon} size={20} className="text-muted-foreground" />
        ) : null}
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      {type !== 'connector' && stars !== undefined && (
        <div className="flex items-center gap-0.5 mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <HugeiconsIcon
              key={i}
              icon={StarIcon}
              size={12}
              className={i < stars ? 'text-yellow-500' : 'text-muted-foreground/30'}
            />
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{description}</p>
    </div>
    <div className="flex items-center">
      {type === 'connector' ? (
        <span
          onClick={(e) => { e.stopPropagation(); onAction?.(); }}
          className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
            connected
              ? 'text-green-500 bg-green-500/10'
              : 'text-foreground bg-muted hover:bg-muted/80'
          }`}
        >
          {connected ? 'Connected' : 'Connect'}
        </span>
      ) : (
        <span
          onClick={(e) => { e.stopPropagation(); onAction?.(); }}
          className="text-xs font-medium text-foreground bg-muted px-3 py-1 rounded-md hover:bg-muted/80 transition-colors"
        >
          Install
        </span>
      )}
    </div>
  </button>
);
