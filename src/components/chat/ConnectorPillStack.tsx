import { useNavigate } from 'react-router-dom';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { CONNECTOR_BRAND_COLORS, CONNECTOR_ICONS, type ConnectorName } from './connectorMentions';

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
        const colors = CONNECTOR_BRAND_COLORS[name];
        const iconSrc = CONNECTOR_ICONS[name];
        return (
          <button
            key={name}
            type="button"
            onClick={() => navigate('/plugins')}
            className="group relative inline-flex items-center gap-1 px-2 py-1 rounded-[8px] text-[10px] font-medium transition-all cursor-pointer hover:pr-6"
            style={{ backgroundColor: colors.bg, color: colors.color }}
            title={name}
          >
            <img src={iconSrc} alt="" className="w-3.5 h-3.5 shrink-0" />
            <span className="max-w-[50px] truncate">{name}</span>
            <span
              onClick={(e) => { e.stopPropagation(); onRemove(name); }}
              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <HugeiconRenderer icon={Cancel01Icon} size={10} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
