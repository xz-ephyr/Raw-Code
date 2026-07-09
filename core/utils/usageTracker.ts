export interface UsageRecord {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: number;
}

const usageLog: UsageRecord[] = [];

export function recordUsage(record: UsageRecord) {
  usageLog.push(record);
}
