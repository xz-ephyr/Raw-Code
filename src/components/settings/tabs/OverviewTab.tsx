import { useState, useEffect, useCallback, useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Activity01Icon, CheckmarkCircle01Icon, Cancel01Icon, CpuIcon, Clock01Icon, ArrowDown01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
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

  useEffect(() => {
    loadConfigured();
    const interval = setInterval(loadConfigured, 2000);
    return () => clearInterval(interval);
  }, [loadConfigured]);

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

  const cards = [
    { icon: Activity01Icon, label: 'Total Requests', value: stats.total, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: CheckmarkCircle01Icon, label: 'Successful', value: stats.succeeded, color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: Cancel01Icon, label: 'Failed', value: stats.failed, color: 'text-red-500', bg: 'bg-red-500/10' },
    { icon: Clock01Icon, label: 'Avg Latency', value: stats.total ? formatLatency(stats.avgLatency) : '-', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { icon: CpuIcon, label: 'Total Tokens', value: stats.totalTokens.toLocaleString(), color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { icon: Activity01Icon, label: 'Success Rate', value: stats.total ? `${Math.round((stats.succeeded / stats.total) * 100)}%` : '-', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
              <HugeiconsIcon icon={card.icon} size={18} className={card.color} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-lg font-bold text-foreground">{card.value}</p>
            </div>
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
          <div className="border border-border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto thin-scrollbar">
            <div className="space-y-0">
              {log.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-border last:border-0 hover:bg-muted/30">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${r.success ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-muted-foreground shrink-0 w-16">{formatTime(r.timestamp)}</span>
                  <span className="text-xs text-foreground truncate min-w-0 flex-1">{r.model}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{getProviderLabel(r.provider)}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatLatency(r.latency)}</span>
                  {r.success && <span className="text-[10px] text-muted-foreground shrink-0">{r.totalTokens}t</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Provider model sections */}
      <div className="grid grid-cols-2 gap-3">
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
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${configuredProviders.has(provider) ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                  {configuredProviders.has(provider) ? 'Connected' : 'Not config'}
                </span>
                <span className="text-[11px] text-muted-foreground">{models.length} models</span>
                <HugeiconsIcon icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon} size={14} className="text-muted-foreground" />
              </button>
              {isExpanded && (
                <div className="divide-y divide-border">
                  {models.map(m => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
                      <ModelIcon modelId={m.id} size={14} />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-foreground">{m.label}</span>
                        <span className="text-[11px] text-muted-foreground ml-2">{m.id}</span>
                      </div>
                      {m.supportsThinking && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-blue-500/10 text-blue-500 font-medium">Thinking</span>
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
