import { useState, useEffect, useCallback, useMemo, useRef, useId } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChartBarIncreasingIcon, CheckmarkBadge01Icon, CancelCircleIcon, CpuChargeIcon, ClockFadingIcon, ChartIncreaseIcon, ArrowDown01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { getUsageStats, getUsageLog, type UsageRecord } from '@core/utils/usageTracker';
import { getProviderLabel, getProvider } from '@core/providers';
import { MODELS, type ModelDefinition } from '@core/config/models';
import { DatabaseService } from '@core/utils/DatabaseService';
import { ModelIcon } from '@/components/ui/ModelIcon';

export function OverviewTab() {
  const [stats, setStats] = useState(getUsageStats());
  const [log, setLog] = useState<UsageRecord[]>([]);

  const grouped = useMemo(() => {
    const map = new Map<string, ModelDefinition[]>();
    for (const m of MODELS) {
      if (!map.has(m.provider)) map.set(m.provider, []);
      map.get(m.provider)!.push(m);
    }
    return map;
  }, []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    () => Object.fromEntries([...grouped.keys()].map(k => [k, false]))
  );
  const [configuredProviders, setConfiguredProviders] = useState<Set<string>>(new Set());

  const loadConfigured = useCallback(async () => {
    const configured = new Set<string>();
    const keys = [...grouped.keys()];
    for (const provider of keys) {
      const p = getProvider(provider);
      if (p) {
        const val = await DatabaseService.getConfig(p.configKey)
          .then(r => r || localStorage.getItem(p.configKey) || '')
          .catch(() => localStorage.getItem(p.configKey) || '');
        if (val.trim()) configured.add(provider);
      }
    }
    setConfiguredProviders(configured);
  }, [grouped]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(() => {
    intervalRef.current = setInterval(loadConfigured, 10000);
  }, [loadConfigured]);

  useEffect(() => {
    loadConfigured();
    startPolling();

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        loadConfigured();
        startPolling();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadConfigured, startPolling]);

  useEffect(() => {
    const s = getUsageStats();
    const l = getUsageLog().reverse().slice(0, 50);
    setStats(s);
    setLog(l);
  }, []);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const sparklineData = useMemo(() => {
    if (log.length < 2) return null;
    const n = 10;
    const sorted = [...log].sort((a, b) => a.timestamp - b.timestamp);
    const chunkSize = Math.max(1, Math.floor(sorted.length / n));
    const series = [];
    for (let i = 0; i < sorted.length; i += chunkSize) {
      series.push(sorted.slice(i, i + chunkSize));
    }
    return {
      requests: series.map(c => c.length),
      success: series.map(c => c.filter(r => r.success).length),
      failed: series.map(c => c.filter(r => !r.success).length),
      latency: series.map(c => c.reduce((s, r) => s + r.latency, 0) / c.length),
      tokens: series.map(c => c.reduce((s, r) => s + (r.totalTokens || 0), 0)),
      rate: series.map(c => c.length ? (c.filter(r => r.success).length / c.length) * 100 : 0),
    };
  }, [log]);

  const cards = [
    { icon: ChartBarIncreasingIcon, label: 'Total Requests', value: stats.total, color: 'text-blue-500', bg: 'bg-blue-500/10', sparkColor: '#3b82f6', dataKey: 'requests' as const },
    { icon: CheckmarkBadge01Icon, label: 'Successful', value: stats.succeeded, color: 'text-green-500', bg: 'bg-green-500/10', sparkColor: '#22c55e', dataKey: 'success' as const },
    { icon: CancelCircleIcon, label: 'Failed', value: stats.failed, color: 'text-red-500', bg: 'bg-red-500/10', sparkColor: '#ef4444', dataKey: 'failed' as const },
    { icon: ClockFadingIcon, label: 'Avg Latency', value: stats.total ? formatLatency(stats.avgLatency) : '-', color: 'text-amber-500', bg: 'bg-amber-500/10', sparkColor: '#f59e0b', dataKey: 'latency' as const },
    { icon: CpuChargeIcon, label: 'Total Tokens', value: stats.totalTokens.toLocaleString(), color: 'text-purple-500', bg: 'bg-purple-500/10', sparkColor: '#a855f7', dataKey: 'tokens' as const },
    { icon: ChartIncreaseIcon, label: 'Success Rate', value: stats.total ? `${Math.round((stats.succeeded / stats.total) * 100)}%` : '-', color: 'text-emerald-500', bg: 'bg-emerald-500/10', sparkColor: '#10b981', dataKey: 'rate' as const },
  ];

  function Sparkline({ data, color: strokeColor }: { data: number[]; color: string }) {
    if (data.length < 2) return null;
    const uid = useId();
    const w = 68, h = 26;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * w,
      y: h - ((v - min) / range) * (h - 8) - 4,
    }));

    let lineD = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      lineD += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    const areaD = lineD + ` L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;

    const mid = Math.max(1, Math.floor(data.length / 2));
    const firstHalf = data.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondHalf = data.slice(mid).reduce((a, b) => a + b, 0) / (data.length - mid);
    const trendPct = firstHalf === 0 ? 0 : Math.round(((secondHalf - firstHalf) / firstHalf) * 100);

    return (
      <div className="flex items-center gap-1 shrink-0">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <defs>
            <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.03" />
            </linearGradient>
            <filter id={`${uid}-glow`}>
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d={areaD} fill={`url(#${uid}-fill)`} />
          <path d={lineD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${uid}-glow)`} />
          <path d={lineD} fill="none" stroke={strokeColor} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x} cy={p.y}
              r={i === pts.length - 1 ? 3 : 1.5}
              fill={i === pts.length - 1 ? '#fff' : strokeColor}
              stroke={i === pts.length - 1 ? strokeColor : 'none'}
              strokeWidth={i === pts.length - 1 ? 2 : 0}
            />
          ))}
        </svg>
        {trendPct !== 0 && (
          <span className={`text-[10px] font-semibold leading-none ${trendPct > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trendPct > 0 ? '↑' : '↓'}{Math.abs(trendPct)}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="border border-border rounded-xl p-4 flex items-center gap-3 relative overflow-hidden group">
            <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center shrink-0 ring-1 ring-white/10 shadow-lg`}>
              <HugeiconsIcon icon={card.icon} size={18} className={card.color} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-lg font-bold text-foreground">{card.value}</p>
            </div>
            {sparklineData && <Sparkline data={sparklineData[card.dataKey]} color={card.sparkColor} />}
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">Recent Activity</h3>
        {log.length === 0 ? (
          <div className="border border-border rounded-xl p-6">
            <p className="text-sm text-muted-foreground">No recent activity. Activity will appear here once you start sending messages using any of the configured providers.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl max-h-[300px] overflow-y-auto thin-scrollbar">
            <div className="space-y-0">
              {log.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-border last:border-0 hover:bg-muted/30">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${r.success ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-muted-foreground shrink-0 w-16">{formatTime(r.timestamp)}</span>
                  <span className="text-xs text-foreground truncate min-w-0 flex-1">{r.model}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{getProviderLabel(r.provider)}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatLatency(r.latency)}</span>
                  {r.success && <span className="text-xs text-muted-foreground shrink-0">{r.totalTokens}t</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([provider, models]) => {
          const isExpanded = expanded[provider] !== false;
          return (
            <div key={provider}>
              <button
                onClick={() => setExpanded({ ...expanded, [provider]: !isExpanded })}
                className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-border hover:bg-muted/50 transition-colors text-left"
              >
                <img src={getProvider(provider)?.icon || ''} alt={getProviderLabel(provider)} className="shrink-0" style={{ width: 22, height: 22 }} />
                <span className="text-sm font-semibold text-foreground flex-1">{getProviderLabel(provider)}</span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${configuredProviders.has(provider) ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                  {configuredProviders.has(provider) ? 'Connected' : 'Not config'}
                </span>
                <span className="text-xs text-muted-foreground">{models.length} models</span>
                <HugeiconsIcon icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon} size={14} className="text-muted-foreground" />
              </button>
              {isExpanded && (
                <div className="divide-y divide-border">
                  {models.map(m => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
                      <ModelIcon modelId={m.id} size={14} />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-foreground">{m.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{m.id}</span>
                      </div>
                      {m.supportsThinking && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 font-medium">Thinking</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
