export interface UsageRecord {
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  success: boolean;
  latency: number;
  timestamp: number;
}

interface UsageStats {
  total: number;
  succeeded: number;
  failed: number;
  totalTokens: number;
  avgLatency: number;
  byModel: Record<string, { requests: number; success: number; failed: number; tokens: number; avgLatency: number }>;
}

const STORAGE_KEY = 'usage-log';
const MAX_RECORDS = 200;
const PERSIST_DEBOUNCE_MS = 2000;

let records: UsageRecord[] | null = null;
let stats: UsageStats | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;

function load(): UsageRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persist() {
  if (!dirty) return;
  dirty = false;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch { /* ignore */ }
}

function schedulePersist() {
  dirty = true;
  if (persistTimer !== null) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persist();
  }, PERSIST_DEBOUNCE_MS);
}

function ensureHydrated() {
  if (records === null) {
    records = load();
    computeStats();
  }
}

function computeStats() {
  const total = records!.length;
  let succeeded = 0;
  let failed = 0;
  let totalTokens = 0;
  let totalLatency = 0;
  const byModel: UsageStats['byModel'] = {};
  const modelLatencies: Record<string, number[]> = {};

  for (const r of records!) {
    if (r.success) succeeded++;
    else failed++;
    totalTokens += r.totalTokens;
    totalLatency += r.latency;

    if (!byModel[r.model]) {
      byModel[r.model] = { requests: 0, success: 0, failed: 0, tokens: 0, avgLatency: 0 };
      modelLatencies[r.model] = [];
    }
    byModel[r.model].requests++;
    if (r.success) byModel[r.model].success++;
    else byModel[r.model].failed++;
    byModel[r.model].tokens += r.totalTokens;
    modelLatencies[r.model].push(r.latency);
  }

  for (const modelId of Object.keys(byModel)) {
    const latencies = modelLatencies[modelId] || [];
    byModel[modelId].avgLatency = latencies.length
      ? latencies.reduce((s, v) => s + v, 0) / latencies.length
      : 0;
  }

  stats = {
    total,
    succeeded,
    failed,
    totalTokens,
    avgLatency: total ? totalLatency / total : 0,
    byModel,
  };
}

function appendRecord(record: UsageRecord) {
  ensureHydrated();
  records!.push(record);
  if (records!.length > MAX_RECORDS) {
    records!.splice(0, records!.length - MAX_RECORDS);
    computeStats();
  } else {
    incrementalUpdateStats(record);
  }
  schedulePersist();
}

function incrementalUpdateStats(record: UsageRecord) {
  if (!stats) { computeStats(); return; }
  stats.total++;
  stats.totalTokens += record.totalTokens;
  stats.avgLatency = stats.total
    ? ((stats.avgLatency * (stats.total - 1)) + record.latency) / stats.total
    : record.latency;

  if (record.success) stats.succeeded++;
  else stats.failed++;

  if (!stats.byModel[record.model]) {
    stats.byModel[record.model] = { requests: 0, success: 0, failed: 0, tokens: 0, avgLatency: 0 };
  }
  const m = stats.byModel[record.model];
  m.requests++;
  m.tokens += record.totalTokens;
  m.avgLatency = ((m.avgLatency * (m.requests - 1)) + record.latency) / m.requests;
  if (record.success) m.success++;
  else m.failed++;
}

export function recordUsage(record: UsageRecord) {
  appendRecord(record);
}

export function getUsageLog(): UsageRecord[] {
  ensureHydrated();
  return records!;
}

export function getUsageStats(): UsageStats {
  ensureHydrated();
  return stats!;
}

if (typeof window !== 'undefined') {
  const handleVisibility = () => {
    if (document.hidden && dirty) {
      if (persistTimer !== null) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      persist();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
}
