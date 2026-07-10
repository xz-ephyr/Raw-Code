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

const STORAGE_KEY = 'usage-log';

function load(): UsageRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(records: UsageRecord[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch {}
}

export function recordUsage(record: UsageRecord) {
  const records = load();
  records.push(record);
  if (records.length > 1000) records.splice(0, records.length - 1000);
  save(records);
}

export function getUsageLog(): UsageRecord[] {
  return load();
}

export function getUsageStats() {
  const records = load();
  const total = records.length;
  const succeeded = records.filter(r => r.success).length;
  const failed = total - succeeded;
  const totalTokens = records.reduce((s, r) => s + r.totalTokens, 0);
  const avgLatency = records.length ? records.reduce((s, r) => s + r.latency, 0) / records.length : 0;

  const byModel: Record<string, { requests: number; success: number; failed: number; tokens: number; avgLatency: number }> = {};
  for (const r of records) {
    if (!byModel[r.model]) byModel[r.model] = { requests: 0, success: 0, failed: 0, tokens: 0, avgLatency: 0 };
    byModel[r.model].requests++;
    if (r.success) byModel[r.model].success++;
    else byModel[r.model].failed++;
    byModel[r.model].tokens += r.totalTokens;
  }
  for (const key in byModel) {
    const m = byModel[key];
    m.avgLatency = m.requests ? records.filter(r => r.model === key).reduce((s, r) => s + r.latency, 0) / m.requests : 0;
  }

  return { total, succeeded, failed, totalTokens, avgLatency, byModel };
}
