import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PlayCircle, Loader2, CheckCircle, XCircle, X, Search, Activity } from 'lucide-react';
import { onAnyEvent } from '@doktor/tool-runtime';
import type { ToolEvent, ToolEventType } from '@doktor/tool-runtime';

type LogStatus = 'starting' | 'running' | 'completed' | 'error';
type LogFilter = 'all' | 'errors' | 'running';

interface ActivityLogEntry {
  id: number;
  timestamp: string;
  status: LogStatus;
  agentTag: string;
  action: string;
  duration: string;
  raw: ToolEvent;
}

interface ActivityLogProps {
  sessionId?: string;
}

const AGENT_ALIASES: Record<string, string> = {
  main: 'Main Chat',
  general: 'General Agent',
  explore: 'Research Agent',
  writer: 'Writer Agent',
  researcher: 'Deep Researcher',
  video: 'Video Agent',
  tool_call: 'Tool Call',
  sub_agent: 'Sub-Agent',
  connector: 'Connector',
  llm: 'LLM',
  skill: 'Skill',
  mcp: 'MCP',
  video_edit: 'Video Edit',
};

const STATUS_CONFIG: Record<LogStatus, { icon: typeof PlayCircle; label: string; dot: string; line: string; bg: string }> = {
  starting: { icon: PlayCircle, label: 'Starting', dot: 'bg-blue-500', line: 'border-blue-400/30', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  running: { icon: Loader2, label: 'Running', dot: 'bg-cyan-500', line: 'border-cyan-400/30', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
  completed: { icon: CheckCircle, label: 'Completed', dot: 'bg-green-500', line: 'border-green-400/30', bg: 'bg-green-50 dark:bg-green-500/10' },
  error: { icon: XCircle, label: 'Error', dot: 'bg-red-500', line: 'border-red-400/30', bg: 'bg-red-50 dark:bg-red-500/10' },
};

const STATUS_TEXT_COLOR: Record<LogStatus, string> = {
  starting: 'text-blue-600 dark:text-blue-400',
  running: 'text-cyan-600 dark:text-cyan-400',
  completed: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
};

function getAgentTag(agentID: string): string {
  return AGENT_ALIASES[agentID] || agentID.slice(0, 8);
}

function getStatus(eventType: ToolEventType): LogStatus {
  switch (eventType) {
    case 'tool_call_start':
    case 'step_start':
    case 'subagent_start':
      return 'starting';
    case 'subagent_step':
    case 'question_pending':
      return 'running';
    case 'tool_call_end':
    case 'step_end':
    case 'subagent_end':
    case 'question_answered':
      return 'completed';
    case 'error':
      return 'error';
  }
}

function getAction(eventType: ToolEventType, payload: Record<string, unknown>): string {
  switch (eventType) {
    case 'tool_call_start':
      return (payload.toolName as string) || 'Tool called';
    case 'tool_call_end':
      return (payload.toolName as string) || 'Tool finished';
    case 'step_start':
      return (payload.description as string) || 'Step';
    case 'step_end':
      return 'Step done';
    case 'subagent_start':
      return 'Agent spawned';
    case 'subagent_end':
      return 'Agent complete';
    case 'subagent_step':
      return (payload.step as string) || 'Agent step';
    case 'question_pending':
      return `Question: "${String(payload.question ?? '').slice(0, 40)}"`;
    case 'question_answered':
      return 'Question answered';
    case 'error':
      return String(payload.message ?? payload.error ?? 'Error');
  }
}

function getDurationKey(event: ToolEvent): string {
  const base = event.type.replace(/_(start|end)$/, '');
  return `${event.agentID}:${base}`;
}

function parseDurationSecs(d: string): number {
  const match = d.match(/^([\d.]+)s$/);
  return match ? parseFloat(match[1]) : 0;
}

const FILTERS: { key: LogFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'errors', label: 'Errors' },
  { key: 'running', label: 'Running' },
];

function MiniSparkline({ data }: { data: number[] }) {
  const w = 80; const h = 20;
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        points={pts} className="text-foreground/30" />
      {data.map((v, i) => {
        const cx = (i / (data.length - 1)) * w;
        return (
          <circle key={i} cx={cx} cy={h - (v / max) * h} r={v > 0 ? 1.5 : 0} fill="currentColor" className="text-foreground/40" />
        );
      })}
    </svg>
  );
}

export function ActivityLog({ sessionId }: ActivityLogProps) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<ActivityLogEntry | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startTimes = useRef(new Map<string, number>());
  const idRef = useRef(0);
  const [panelHeight, setPanelHeight] = useState(() => {
    const saved = localStorage.getItem('activity-log-height');
    return saved ? parseInt(saved, 10) : 320;
  });
  const resizingRef = useRef(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const MAX_DURATION_BAR = 5;

  const sparklineData = useMemo(() => {
    if (entries.length === 0) return [];
    const buckets = 10;
    const now = Date.now();
    const windowMs = 120000;
    const bucketMs = windowMs / buckets;
    const result = new Array(buckets).fill(0);
    for (const e of entries) {
      const t = new Date(e.raw.timestamp).getTime();
      const idx = Math.min(buckets - 1, Math.floor((now - t) / bucketMs));
      if (idx >= 0 && idx < buckets) result[idx]++;
    }
    return result.reverse();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.action.toLowerCase().includes(q) ||
        e.agentTag.toLowerCase().includes(q)
      );
    }
    if (filter === 'errors') {
      result = result.filter(e => e.status === 'error');
    } else if (filter === 'running') {
      result = result.filter(e => e.status === 'running' || e.status === 'starting');
    }
    return result;
  }, [entries, filter, searchQuery]);

  useEffect(() => {
    const unsub = onAnyEvent((event: ToolEvent) => {
      if (sessionId && event.sessionID !== sessionId) return;

      const ts = new Date(event.timestamp).toLocaleTimeString('en-US', {
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
      });

      let duration = '';
      const key = getDurationKey(event);
      if (event.type.endsWith('_start')) {
        startTimes.current.set(key, event.timestamp);
      } else if (event.type.endsWith('_end')) {
        const startTime = startTimes.current.get(key);
        if (startTime) {
          const secs = ((event.timestamp - startTime) / 1000).toFixed(1);
          duration = `${secs}s`;
          startTimes.current.delete(key);
        }
      } else if (event.type === 'error') {
        duration = '—';
      }

      const entry: ActivityLogEntry = {
        id: idRef.current++,
        timestamp: ts,
        status: getStatus(event.type),
        agentTag: getAgentTag(event.agentID),
        action: getAction(event.type, event.payload),
        duration,
        raw: event,
      };
      setEntries((prev) => [...prev.slice(-99), entry]);
    });
    return unsub;
  }, [sessionId]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredEntries.length, autoScroll]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    const startY = e.clientY;
    const startH = panelHeight;

    const onMove = (me: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = me.clientY - startY;
      const newH = Math.max(140, Math.min(800, startH - delta));
      setPanelHeight(newH);
      localStorage.setItem('activity-log-height', String(newH));
    };
    const onUp = () => {
      resizingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelHeight]);

  const handleClear = useCallback(() => {
    setEntries([]);
    idRef.current = 0;
    startTimes.current.clear();
  }, []);

  return (
    <>
      <div
        className="w-full border border-border rounded-xl bg-card overflow-hidden shadow-sm"
        style={{ height: panelHeight }}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                  filter === f.key
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="relative ml-1">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-[120px] pl-6 pr-2 py-0.5 text-xs rounded border border-border bg-transparent text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                autoScroll ? 'text-foreground/60' : 'text-muted-foreground/40'
              }`}
              title="Auto-scroll"
            >
              {autoScroll ? 'Auto ▼' : 'Manual'}
            </button>
            <span className="text-[10px] text-muted-foreground">{filteredEntries.length} entries</span>
            {entries.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
              >
                <X size={12} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Sparkline */}
        {entries.length > 5 && sparklineData.some(v => v > 0) && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-muted/20">
            <Activity size={12} className="text-muted-foreground/40 shrink-0" />
            <MiniSparkline data={sparklineData} />
            <span className="text-[10px] text-muted-foreground/40 ml-auto">Last 2m activity</span>
          </div>
        )}

        {/* Entries */}
        <div
          ref={scrollRef}
          className="overflow-y-auto thin-scrollbar"
          style={{ height: panelHeight - 36 - (entries.length > 5 && sparklineData.some(v => v > 0) ? 28 : 0) }}
        >
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground/40 py-8 gap-2">
              <Activity size={20} className="text-muted-foreground/20" />
              <span>{entries.length === 0 ? 'Waiting for activity...' : 'No matching entries'}</span>
            </div>
          ) : (
            <div className="relative pl-5 pr-2 pt-2 pb-1 space-y-0">
              {/* Timeline vertical line */}
              <div className="absolute left-[14px] top-2 bottom-1 w-px bg-border/60 pointer-events-none" />

              {filteredEntries.map((entry) => {
                const cfg = STATUS_CONFIG[entry.status];
                const Icon = cfg.icon;
                const durSecs = parseDurationSecs(entry.duration);
                const durPct = durSecs > 0 ? Math.min(durSecs / MAX_DURATION_BAR, 1) * 100 : 0;

                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="relative flex items-start gap-3 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-muted/40 transition-all duration-150 group log-entry"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-[11px] top-[10px]">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot} ring-2 ring-card ${
                        entry.status === 'running' ? 'animate-pulse-ring' : ''
                      }`} />
                    </div>

                    {/* Status icon */}
                    <div className={`shrink-0 mt-0.5 ${STATUS_TEXT_COLOR[entry.status]}`}>
                      <Icon size={13} className={entry.status === 'running' ? 'animate-spin' : ''} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-foreground/80 truncate max-w-[180px]">{entry.action}</span>
                        <span className={`text-[10px] font-mono ${STATUS_TEXT_COLOR[entry.status]} opacity-70`}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground/30">{entry.timestamp}</span>
                        <span className="text-[10px] font-mono text-muted-foreground/20">·</span>
                        <span className="text-[10px] font-mono text-muted-foreground/40">{entry.agentTag}</span>
                        {entry.duration && (
                          <>
                            <span className="text-[10px] font-mono text-muted-foreground/20">·</span>
                            <span className="text-[10px] font-mono text-muted-foreground/30">{entry.duration}</span>
                            {durSecs > 0 && (
                              <span className="hidden sm:inline-flex items-center gap-1.5 ml-1">
                                <span className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                                  <span
                                    className="block h-full rounded-full bg-muted-foreground/30 transition-all duration-500"
                                    style={{ width: `${durPct}%` }}
                                  />
                                </span>
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className="h-1.5 cursor-row-resize hover:bg-foreground/10 active:bg-foreground/20 rounded-full transition-colors -mt-0.5 relative z-10"
      />

      {/* Detail modal */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="bg-card border border-border rounded-xl p-5 max-w-lg w-full mx-4 shadow-xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Event Details</h3>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <DetailRow label="Time" value={selectedEntry.timestamp} />
              <DetailRow label="Status" value={selectedEntry.status} />
              <DetailRow label="Agent" value={selectedEntry.agentTag} />
              <DetailRow label="Action" value={selectedEntry.action} />
              <DetailRow label="Duration" value={selectedEntry.duration} />
              <DetailRow label="Session ID" value={selectedEntry.raw.sessionID} />
              <DetailRow label="Agent ID" value={selectedEntry.raw.agentID} />
              <DetailRow label="Event Type" value={selectedEntry.raw.type} />
            </div>
            {Object.keys(selectedEntry.raw.payload).length > 0 && (
              <div className="mt-3">
                <span className="text-xs font-medium text-muted-foreground mb-1 block">Payload</span>
                <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto max-h-40 text-foreground/80">
                  {JSON.stringify(selectedEntry.raw.payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes logEntryIn {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .log-entry {
          animation: logEntryIn 0.2s ease-out;
        }

        @keyframes pulseRing {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
        .animate-pulse-ring {
          animation: pulseRing 1.5s ease-in-out infinite;
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scaleIn {
          animation: scaleIn 0.15s ease-out;
        }
      `}</style>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-mono text-xs max-w-[60%] truncate">{value}</span>
    </div>
  );
}