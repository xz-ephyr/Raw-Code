import { useEffect, useState } from 'react';

interface ModeStatus {
  available: boolean;
  lastRunTimestamp: string | null;
  lastResult: 'pass' | 'fail' | 'skip' | null;
  evidence: string[];
  testType: 'real' | 'mock';
}

interface SelftestStatus {
  timestamp: string;
  modes: Record<string, ModeStatus>;
  overall: 'pass' | 'fail' | 'skip';
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pass: 'bg-green-500/20 text-green-400 border-green-500/30',
  fail: 'bg-red-500/20 text-red-400 border-red-500/30',
  skip: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const MODE_LABELS: Record<string, string> = {
  default: 'Default',
  teamwork: 'Teamwork',
  antigravity: 'Antigravity',
};

export default function SelftestStatusBadge() {
  const [status, setStatus] = useState<SelftestStatus | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/selftest/status');
        if (!res.ok) return;
        const data = await res.json() as SelftestStatus;
        if (mounted) setStatus(data);
      } catch {
        // server not available
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (!status) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500" data-testid="selftest-badge-loading">
        <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
        Status: loading
      </div>
    );
  }

  const modeEntries = Object.entries(status.modes);

  return (
    <div className="relative" data-testid="selftest-badge">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-gray-700/50 hover:bg-gray-800/50 transition-colors cursor-pointer"
        data-testid="selftest-badge-trigger"
      >
        {modeEntries.map(([key, mode]) => (
          <span
            key={key}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
              key === 'antigravity' && !mode.available
                ? 'bg-blue-500/15 text-blue-400'
                : mode.available
                  ? STATUS_BADGE_CLASSES.pass
                  : STATUS_BADGE_CLASSES.fail
            }`}
            data-testid={`badge-${key}`}
          >
            {key === 'antigravity' && !mode.available ? '🔄' : mode.available ? '✓' : '✗'}
            {MODE_LABELS[key] || key}
          </span>
        ))}
      </button>

      {expanded && (
        <div
          className="absolute top-full right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 p-4 text-xs"
          data-testid="selftest-details"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-300">Mode Status</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
              status.overall === 'pass' ? 'bg-green-500/20 text-green-400' :
              status.overall === 'fail' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {status.overall.toUpperCase()}
            </span>
          </div>

          {modeEntries.map(([key, mode]) => (
            <div key={key} className="mb-2 last:mb-0 p-2 rounded bg-gray-800/50" data-testid={`detail-${key}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-200">{MODE_LABELS[key] || key}</span>
                <div className="flex items-center gap-2">
                  {key === 'antigravity' && !mode.available && (
                    <span className="text-blue-400 text-[10px] font-medium" data-testid="coming-soon-badge">
                      Coming Soon
                    </span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                    STATUS_BADGE_CLASSES[mode.lastResult || 'skip']
                  }`}>
                    {mode.available ? 'Available' : key === 'antigravity' ? 'Not Ready' : 'Unavailable'}
                  </span>
                </div>
              </div>
              {mode.evidence.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {mode.evidence.map((e, i) => (
                    <li key={i} className="text-gray-400 truncate">{e}</li>
                  ))}
                </ul>
              )}
              <div className="mt-1 flex gap-2 text-[10px] text-gray-500">
                <span>{mode.testType === 'real' ? 'Live check' : 'Mock/contract'}</span>
                {mode.lastRunTimestamp && <span>Checked: {new Date(mode.lastRunTimestamp).toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
