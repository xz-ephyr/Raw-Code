import { useState, useEffect, useRef } from 'react';
import { CLIBridgeService } from '@/services/CLIBridgeService';
import { CLIModelInjector } from '@/services/CLIModelInjector';
import { CLIIcon } from './CLIIcon';

export function ConnectedCLIIcons() {
  const [hasOpenCode, setHasOpenCode] = useState(() => CLIBridgeService.getBridges().length > 0);
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = CLIBridgeService.onBridgesChange((bridges) => {
      setHasOpenCode(bridges.length > 0);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expanded]);

  if (!hasOpenCode) return null;

  const bridge = CLIBridgeService.getBridge('opencode');
  if (!bridge) return null;

  const handleToggle = async () => {
    if (expanded) {
      setExpanded(false);
      CLIModelInjector.deselectCLI('opencode');
    } else {
      setExpanded(true);
      await CLIModelInjector.selectCLI(bridge);
    }
  };

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      {!expanded ? (
        <button
          onClick={handleToggle}
          className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center hover:bg-neutral-700 transition-all relative"
          title="opencode"
        >
          <CLIIcon cliId="opencode" size={14} />
          {bridge.isConnected() && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-neutral-800" />
          )}
        </button>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-900/30 border-blue-800 text-blue-300 transition-all cursor-default">
          <CLIIcon cliId="opencode" size={12} />
          opencode
        </span>
      )}
    </div>
  );
}
