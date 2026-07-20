import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChartBarIncreasingIcon, CheckmarkBadge01Icon, CancelCircleIcon, CpuChargeIcon, ClockFadingIcon, ChartIncreaseIcon, Activity01Icon, ArrowDown01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { getUsageStats, getUsageLog, type UsageRecord } from '@core/utils/usageTracker';
import { getProviderLabel, getProvider } from '@core/providers';
import { MODELS, type ModelDefinition } from '@core/config/models';
import { DatabaseService } from '@core/utils/DatabaseService';
import { ModelIcon } from '@/components/ui/ModelIcon';

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    if (start === end) { setDisplay(end); return; }
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / 800, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = end;
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const svg = useMemo(() => {
    if (data.length < 2) return null;
    const w = 80, h = 32;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * w,
      y: h - ((v - min) / range) * (h - 6) - 3,
    }));

    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)},${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)},${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
        <defs>
          <linearGradient id={`spark-fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={d + ` L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`} fill={`url(#spark-fill-${color.replace('#', '')})`} />
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2" fill={color} />
      </svg>
    );
  }, [data, color]);

  return svg;
}

function MiniDonut({ pct, color }: { pct: number; color: string }) {
  const r = 12, cx = 18, cy = 18;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="3" strokeOpacity="0.3" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
    </svg>
  );
}

function DualSparkline({ data }: { data: { prompt: number; completion: number }[] }) {
  const svg = useMemo(() => {
    if (data.length < 2) return null;
    const w = 80, h = 32;
    const allVals = data.flatMap(d => [d.prompt, d.completion]);
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const range = max - min || 1;
    const scale = (v: number) => h - ((v - min) / range) * (h - 6) - 3;

    const promptPts = data.map((d, i) => ({
      x: (i / (data.length - 1)) * w,
      y: scale(d.prompt),
    }));
    const compPts = data.map((d, i) => ({
      x: (i / (data.length - 1)) * w,
      y: scale(d.completion),
    }));

    const curve = (pts: { x: number; y: number }[]) => {
      let d = `M${pts[0].x},${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)},${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)},${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
      }
      return d;
    };

    const promptD = curve(promptPts);
    const compD = curve(compPts);
    const promptFill = promptD + ` L${promptPts[promptPts.length - 1].x},${h} L${promptPts[0].x},${h} Z`;
    const compFill = compD + ` L${compPts[compPts.length - 1].x},${h} L${compPts[0].x},${h} Z`;

    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
        <path d={promptFill} fill="#3b82f6" fillOpacity="0.12" />
        <path d={compFill} fill="#8b5cf6" fillOpacity="0.12" />
        <path d={promptD} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={compD} fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={promptPts[promptPts.length - 1].x} cy={promptPts[promptPts.length - 1].y} r="2" fill="#3b82f6" />
        <circle cx={compPts[compPts.length - 1].x} cy={compPts[compPts.length - 1].y} r="2" fill="#8b5cf6" />
      </svg>
    );
  }, [data]);

  return svg;
}

function ActivityTimeline({ log }: { log: UsageRecord[] }) {
  const groups = useMemo(() => {
    const g: Record<string, UsageRecord[]> = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    for (const r of log) {
      const key = r.timestamp >= today ? 'today' : r.timestamp >= yesterday ? 'yesterday' : 'older';
      if (!g[key]) g[key] = [];
      g[key].push(r);
    }
    return g;
  }, [log]);

  const labels: Record<string, string> = { today: 'Today', yesterday: 'Yesterday', older: 'Older' };

  if (log.length === 0) {
    return (
      <div className="border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2">
        <HugeiconsIcon icon={Activity01Icon} size={20} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="max-h-[400px] overflow-y-auto thin-scrollbar">
        {Object.entries(groups).map(([key, records]) => (
          <div key={key}>
            <div className="sticky top-0 px-4 py-1.5 bg-muted border-b border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{labels[key]}</span>
            </div>
            {records.map((r) => {
              const d = new Date(r.timestamp);
              const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={r.timestamp + r.model + r.provider} className="flex items-center gap-3 px-4 py-2 border-b border-border last:border-0 hover:bg-muted/20">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${r.success ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-[11px] text-muted-foreground font-mono w-12 shrink-0">{time}</span>
                  <span className="text-xs text-foreground truncate min-w-0 flex-1">{r.model}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{getProviderLabel(r.provider)}</span>
                  <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                    {r.latency < 1000 ? `${Math.round(r.latency)}ms` : `${(r.latency / 1000).toFixed(1)}s`}
                  </span>
                  {r.success && r.totalTokens > 0 && (
                    <span className="text-[11px] text-muted-foreground font-mono shrink-0">{r.totalTokens}t</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function CollapsibleLog({ log }: { log: UsageRecord[] }) {
  const [open, setOpen] = useState(false);
  const failed = log.filter(r => !r.success).length;
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        <HugeiconsIcon icon={Activity01Icon} size={14} className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-foreground flex-1 truncate">Activity Log</span>
        <span className="text-[11px] text-muted-foreground shrink-0">{log.length} calls</span>
        {failed > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">{failed} failed</span>
        )}
        <HugeiconsIcon icon={open ? ArrowDown01Icon : ArrowRight01Icon} size={12} className="text-muted-foreground shrink-0" />
      </button>
      {open && <div className="border-t border-border">{<ActivityTimeline log={log} />}</div>}
    </div>
  );
}

export function OverviewTab() {
  const initialLog = useMemo(() => [...getUsageLog()].reverse().slice(0, 50), []);
  const [stats, setStats] = useState(getUsageStats);
  const [log, setLog] = useState<UsageRecord[]>(initialLog);

  const grouped = useMemo(() => {
    const map = new Map<string, ModelDefinition[]>();
    for (const m of MODELS) {
      if (!map.has(m.provider)) map.set(m.provider, []);
      map.get(m.provider)!.push(m);
    }
    return map;
  }, []);

  const [configuredProviders, setConfiguredProviders] = useState<Set<string>>(new Set());

  const loadConfigured = useCallback(async () => {
    const configured = new Set<string>();
    for (const provider of grouped.keys()) {
      const p = getProvider(provider);
      if (p) {
        try {
          const val = await DatabaseService.getConfig(p.configKey)
            .then(r => r || localStorage.getItem(p.configKey) || '');
          if (val.trim()) configured.add(provider);
        } catch {
          /* transient error, skip */
        }
      }
    }
    setConfiguredProviders(configured);
  }, [grouped]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    intervalRef.current = setInterval(loadConfigured, 10000);
  }, [loadConfigured, stopPolling]);

  useEffect(() => {
    loadConfigured();
    startPolling();
    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        loadConfigured();
        startPolling();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadConfigured, startPolling, stopPolling]);

  const refreshStats = useCallback(() => {
    const newStats = getUsageStats();
    setStats(prev => prev === newStats ? prev : newStats);
    const raw = getUsageLog();
    if (raw.length === 0) return;
    const reversed = [...raw].reverse().slice(0, 50);
    setLog(prev => {
      if (prev.length === reversed.length && prev.every((r, i) => r.timestamp === reversed[i].timestamp)) return prev;
      return reversed;
    });
  }, []);

  useEffect(() => {
    const statsInterval = setInterval(refreshStats, 5000);
    return () => clearInterval(statsInterval);
  }, [refreshStats]);

  const promptTotal = useMemo(() => log.reduce((s, r) => s + (r.promptTokens || 0), 0), [log]);
  const completionTotal = useMemo(() => log.reduce((s, r) => s + (r.completionTokens || 0), 0), [log]);

  const sparklineData = useMemo(() => {
    if (log.length < 2) return null;
    const sorted = [...log].sort((a, b) => a.timestamp - b.timestamp);
    const chunkSize = Math.max(1, Math.floor(sorted.length / 10));
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
      promptCompletion: series.map(c => ({
        prompt: c.reduce((s, r) => s + (r.promptTokens || 0), 0),
        completion: c.reduce((s, r) => s + (r.completionTokens || 0), 0),
      })),
    };
  }, [log]);

  const cards = [
    { icon: ChartBarIncreasingIcon, label: 'Token Split', value: stats.total ? `${((completionTotal / (promptTotal + completionTotal)) * 100).toFixed(0)}% output` : '-', sparkColor: '#8b5cf6', dataKey: 'promptCompletion' as const },
    { icon: CheckmarkBadge01Icon, label: 'Successful', value: stats.succeeded, sparkColor: '#22c55e', dataKey: 'success' as const },
    { icon: CancelCircleIcon, label: 'Failed', value: stats.failed, sparkColor: '#ef4444', dataKey: 'failed' as const },
    { icon: ClockFadingIcon, label: 'Avg Latency', value: stats.total ? `${stats.avgLatency < 1000 ? `${Math.round(stats.avgLatency)}ms` : `${(stats.avgLatency / 1000).toFixed(1)}s`}` : '-', sparkColor: '#f59e0b', dataKey: 'latency' as const },
    { icon: CpuChargeIcon, label: 'Total Tokens', value: stats.totalTokens.toLocaleString(), sparkColor: '#a855f7', dataKey: 'tokens' as const },
    { icon: ChartIncreaseIcon, label: 'Success Rate', value: stats.total ? `${Math.round((stats.succeeded / stats.total) * 100)}%` : '-', sparkColor: '#10b981', dataKey: 'rate' as const },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {cards.map((card) => (
          <div key={card.label} className="border border-border rounded-lg p-3 flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <HugeiconsIcon icon={card.icon} size={14} className="text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground font-medium truncate">{card.label}</span>
              </div>
              {sparklineData && card.dataKey === 'promptCompletion' ? (
                <DualSparkline data={sparklineData.promptCompletion} />
              ) : sparklineData && card.label === 'Success Rate' ? (
                <MiniDonut pct={stats.total ? (stats.succeeded / stats.total) * 100 : 0} color={card.sparkColor} />
              ) : sparklineData ? (
                <Sparkline data={sparklineData[card.dataKey] as number[]} color={card.sparkColor} />
              ) : null}
            </div>
            <span className="text-lg font-bold text-foreground tabular-nums tracking-tight leading-none">
              {typeof card.value === 'number' ? <AnimatedNumber value={card.value} /> : card.value}
            </span>
          </div>
        ))}
      </div>

      <CollapsibleLog log={log} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Array.from(grouped.entries()).sort((a, b) => {
          const rank: Record<string, number> = { anthropic: 0, openai: 1, google: 2, deepseek: 3, mistral: 4, cohere: 5, groq: 6, together: 7, openrouter: 8, nvidia: 9, cerebras: 10, sambanova: 11, huggingface: 12, cloudflare: 13 };
          // Keep in sync with the provider registry order when adding new providers
          return (rank[a[0]] ?? 99) - (rank[b[0]] ?? 99);
        }).map(([provider, models]) => {
          const providerInfo = getProvider(provider);
          const configured = configuredProviders.has(provider);
          return (
            <ProviderSection
              key={provider}
              provider={provider}
              label={getProviderLabel(provider)}
              icon={providerInfo?.icon || ''}
              models={models}
              configured={configured}
            />
          );
        })}
      </div>
    </div>
  );
}

function ProviderSection({ provider, label, icon, models, configured }: {
  provider: string;
  label: string;
  icon: string;
  models: ModelDefinition[];
  configured: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        {icon ? (
          <img src={icon} alt="" loading="lazy" className="w-5 h-5 shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">{provider[0].toUpperCase()}</div>
        )}
        <span className="text-sm font-medium text-foreground flex-1 truncate">{label}</span>
        <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${configured ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
          {configured ? '✓' : '—'}
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">{models.length}</span>
        <HugeiconsIcon icon={expanded ? ArrowDown01Icon : ArrowRight01Icon} size={12} className="text-muted-foreground shrink-0" />
      </button>
      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {models.map(m => (
            <div key={m.id} className="flex items-center gap-2.5 px-3 py-2 pl-[40px] hover:bg-muted/20">
              <ModelIcon modelId={m.id} size={12} />
              <span className="text-xs text-foreground">{m.label}</span>
              <span className="text-[10px] text-muted-foreground font-mono ml-auto">{m.id}</span>
              {m.supportsThinking && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">Thinking</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
