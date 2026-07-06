export type SchedulePreset = 'daily' | 'weekdays' | 'weekly' | 'custom';

export interface ScheduledTask {
  id: string;
  title: string;
  prompt: string;
  cron: string;
  preset: SchedulePreset;
  modelId: string;
  enabled: boolean;
  lastRunAt: number | null;
  nextRunAt: number | null;
  createdAt: number;
}

export interface ScheduledTaskRun {
  id: string;
  taskId: string;
  startedAt: number;
  finishedAt: number | null;
  status: 'running' | 'success' | 'failed';
  resultPreview: string | null;
  error: string | null;
}
