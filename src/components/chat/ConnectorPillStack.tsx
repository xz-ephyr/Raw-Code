import { useNavigate } from 'react-router-dom';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { CONNECTOR_ICONS, type ConnectorName } from './connectorMentions';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface ConnectorPillStackProps {
  connectors: ConnectorName[];
  connected: Set<string>;
  onRemove: (name: string) => void;
}

export function ConnectorPillStack({ connectors, connected, onRemove }: ConnectorPillStackProps) {
  const navigate = useNavigate();
  const installed = connectors.filter((c) => connected.has(c));

  if (installed.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5">
      {installed.map((name) => {
        const iconSrc = CONNECTOR_ICONS[name];
        return (
          <Tooltip key={name}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => navigate('/plugins')}
                className="group relative inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-all cursor-pointer hover:pr-6"
                style={{ color: '#3B82F6' }}
              >
            <span className="inline-flex items-center justify-center w-4 h-4 bg-white rounded-[6px]">
              <img src={iconSrc} alt="" loading="lazy" className="w-3 h-3 shrink-0" />
            </span>
            <span className="max-w-[50px] truncate">{name}</span>
            <span
              onClick={(e) => { e.stopPropagation(); onRemove(name); }}
              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <HugeiconRenderer icon={Cancel01Icon} size={10} />
            </span>
          </button>
            </TooltipTrigger>
            <TooltipContent>{name}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
