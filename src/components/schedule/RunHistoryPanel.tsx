import { Cancel01Icon, CheckmarkCircle02Icon, Loading04Icon } from '@hugeicons/core-free-icons';
import type { ScheduledTask, ScheduledTaskRun } from '@/types/schedule';
import { cn } from '@/lib/utils';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';

interface RunHistoryPanelProps {
  task: ScheduledTask;
  runs: ScheduledTaskRun[];
  isOpen: boolean;
  onClose: () => void;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + `, ${time}`;
}

function formatDuration(startedAt: number, finishedAt: number | null): string {
  if (!finishedAt) return '...';
  const seconds = Math.round((finishedAt - startedAt) / 1000);
  if (seconds < 1) return '<1s';
  return `${seconds}s`;
}

function getStatusIcon(status: ScheduledTaskRun['status']) {
  switch (status) {
    case 'success':
      return CheckmarkCircle02Icon;
    case 'failed':
      return Cancel01Icon;
    case 'running':
      return Loading04Icon;
  }
}

function getStatusColor(status: ScheduledTaskRun['status']): string {
  switch (status) {
    case 'success':
      return 'text-emerald-400';
    case 'failed':
      return 'text-red-500';
    case 'running':
      return 'text-blue-400';
  }
}

function getStatusLabel(status: ScheduledTaskRun['status']): string {
  switch (status) {
    case 'success':
      return 'Success';
    case 'failed':
      return 'Failed';
    case 'running':
      return 'Running';
  }
}

export function RunHistoryPanel({ task, runs, isOpen, onClose }: RunHistoryPanelProps) {
  return (
    <div
      className={cn(
        'fixed top-0 right-0 h-full w-[380px] z-50 flex flex-col',
        'bg-card border-l border-border',
        'rounded-[10px]',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-sm font-medium text-foreground truncate">
          History: {task.title}
        </h2>
        <button
          onClick={onClose}
          className={cn(
            'p-1.5 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 ml-2 cursor-pointer'
          )}
          aria-label="Close history panel"
        >
          <HugeiconRenderer icon={Cancel01Icon} size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {runs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No runs yet
          </div>
        ) : (
          runs.map((run) => (
            <div
              key={run.id}
              className="rounded-[8px] bg-muted p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(run.startedAt)}
                </span>
                <div className="flex items-center gap-1.5">
                  <HugeiconRenderer
                    icon={getStatusIcon(run.status)}
                    size={14}
                    className={cn(
                      getStatusColor(run.status),
                      run.status === 'running' && 'animate-spin'
                    )}
                  />
                  <span className={cn('text-xs font-medium', getStatusColor(run.status))}>
                    {getStatusLabel(run.status)}
                  </span>
                </div>
              </div>

              {run.status !== 'running' && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Duration: {formatDuration(run.startedAt, run.finishedAt)}</span>
                </div>
              )}

              {run.resultPreview && (
                <p className="text-xs text-foreground/80 line-clamp-2">
                  {run.resultPreview}
                </p>
              )}

              {run.error && (
                <p className="text-xs text-red-400 line-clamp-2">
                  Error: {run.error}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
