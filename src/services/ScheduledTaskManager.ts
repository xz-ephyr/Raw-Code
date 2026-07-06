import { ScheduledTask, ScheduledTaskRun, SchedulePreset } from '@/types/schedule';
import { DEFAULT_MODEL } from '@core/config/models';

function computeNextRunAt(preset: SchedulePreset, cron: string): number {
  const now = Date.now();
  const parts = cron.split(' ');
  const minute = parseInt(parts[0] || '0', 10);
  const hour = parseInt(parts[1] || '9', 10);

  const next = new Date();
  next.setHours(hour, minute, 0, 0);

  if (preset === 'daily') {
    if (next.getTime() <= now) next.setDate(next.getDate() + 1);
    return next.getTime();
  }

  if (preset === 'weekdays') {
    for (let i = 0; i < 8; i++) {
      const d = new Date(next);
      d.setDate(d.getDate() + i);
      const day = d.getDay();
      if (day >= 1 && day <= 5) {
        if (d.getTime() > now) return d.getTime();
      }
    }
  }

  if (preset === 'weekly') {
    for (let i = 0; i < 8; i++) {
      const d = new Date(next);
      d.setDate(d.getDate() + i);
      if (d.getDay() === 1 && d.getTime() > now) return d.getTime();
    }
  }

  return now + 86400000;
}

const TASKS_KEY = 'scheduled_tasks';
const RUNS_KEY = 'scheduled_task_runs';

function loadTasks(): ScheduledTask[] {
  try {
    return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
  } catch (e) {
    console.error('Failed to load scheduled tasks:', e);
    return [];
  }
}

function saveTasks(tasks: ScheduledTask[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save scheduled tasks:', e);
  }
}

function loadRuns(): ScheduledTaskRun[] {
  try {
    return JSON.parse(localStorage.getItem(RUNS_KEY) || '[]');
  } catch (e) {
    console.error('Failed to load scheduled task runs:', e);
    return [];
  }
}

function saveRuns(runs: ScheduledTaskRun[]): void {
  try {
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
  } catch (e) {
    console.error('Failed to save scheduled task runs:', e);
  }
}

export class ScheduledTaskManager {
  static async getAll(): Promise<ScheduledTask[]> {
    const tasks = loadTasks();
    return tasks.sort((a, b) => b.createdAt - a.createdAt);
  }

  static async getById(id: string): Promise<ScheduledTask | null> {
    const tasks = loadTasks();
    return tasks.find((t) => t.id === id) || null;
  }

  static async create(data: { title: string; prompt: string; cron: string; preset: SchedulePreset; modelId?: string }): Promise<ScheduledTask> {
    const tasks = loadTasks();
    const task: ScheduledTask = {
      id: crypto.randomUUID(),
      title: data.title,
      prompt: data.prompt,
      cron: data.cron,
      preset: data.preset,
      modelId: data.modelId ?? DEFAULT_MODEL,
      enabled: true,
      lastRunAt: null,
      nextRunAt: computeNextRunAt(data.preset, data.cron),
      createdAt: Date.now(),
    };
    tasks.push(task);
    saveTasks(tasks);
    return task;
  }

  static async update(id: string, data: Partial<Pick<ScheduledTask, 'title' | 'prompt' | 'cron' | 'preset' | 'enabled' | 'modelId'>>): Promise<ScheduledTask | null> {
    const tasks = loadTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const merged = { ...tasks[index], ...data };
    if (data.preset || data.cron) {
      merged.nextRunAt = computeNextRunAt(merged.preset, merged.cron);
    }
    tasks[index] = merged;
    saveTasks(tasks);
    return tasks[index];
  }

  static async delete(id: string): Promise<void> {
    const tasks = loadTasks();
    const filtered = tasks.filter((t) => t.id !== id);
    if (filtered.length !== tasks.length) {
      saveTasks(filtered);
    }
  }

  static async toggleEnabled(id: string): Promise<ScheduledTask | null> {
    const tasks = loadTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;
    tasks[index] = { ...tasks[index], enabled: !tasks[index].enabled };
    saveTasks(tasks);
    return tasks[index];
  }

  static async getRuns(taskId: string): Promise<ScheduledTaskRun[]> {
    const runs = loadRuns();
    return runs.filter((r) => r.taskId === taskId).sort((a, b) => b.startedAt - a.startedAt);
  }

  static async addRun(data: { taskId: string; startedAt: number }): Promise<ScheduledTaskRun> {
    const runs = loadRuns();
    const run: ScheduledTaskRun = {
      id: crypto.randomUUID(),
      taskId: data.taskId,
      startedAt: data.startedAt,
      finishedAt: null,
      status: 'running',
      resultPreview: null,
      error: null,
    };
    runs.push(run);
    saveRuns(runs);
    return run;
  }

  static async completeRun(id: string, data: { finishedAt: number; status: 'success' | 'failed'; resultPreview?: string; error?: string }): Promise<ScheduledTaskRun | null> {
    const runs = loadRuns();
    const index = runs.findIndex((r) => r.id === id);
    if (index === -1) return null;
    runs[index] = {
      ...runs[index],
      finishedAt: data.finishedAt,
      status: data.status,
      resultPreview: data.resultPreview ?? null,
      error: data.error ?? null,
    };
    saveRuns(runs);
    return runs[index];
  }

  static async deleteRunsForTask(taskId: string): Promise<void> {
    const runs = loadRuns();
    const filtered = runs.filter((r) => r.taskId !== taskId);
    if (filtered.length !== runs.length) {
      saveRuns(filtered);
    }
  }
}
