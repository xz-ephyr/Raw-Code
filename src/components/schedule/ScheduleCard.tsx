import { useState, useEffect, useRef } from 'react';
import {
  Time03Icon,
  Edit02Icon,
  Delete02Icon,
  HistoryIcon,
  CheckmarkCircle02Icon,
  MoreVerticalIcon,
  AiCloudIcon,
} from '@hugeicons/core-free-icons';
import { ScheduledTask, SchedulePreset } from '@/types/schedule';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useToast } from '../ui/Toast';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { getModelDefinition } from '@core/config/models';

interface ScheduleCardProps {
  task: ScheduledTask;
  onToggle: (id: string) => void;
  onEdit: (task: ScheduledTask) => void;
  onDelete: (id: string) => void;
  onShowHistory: (task: ScheduledTask) => void;
}

function describeCron(cron: string, preset: SchedulePreset): string {
  switch (preset) {
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return 'Every weekday (Mon-Fri)';
    case 'weekly':
      return 'Once a week';
    case 'custom':
      return cron;
    default:
      return cron;
  }
}

function formatFutureTime(timestamp: number): string {
  const diff = timestamp - Date.now();
  if (diff <= 0) return 'Due now';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours < 1) return `in ${minutes}m`;
  if (hours < 24) return `in ${hours}h`;
  if (hours < 48) return 'Tomorrow';
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

export function ScheduleCard({ task, onToggle, onEdit, onDelete, onShowHistory }: ScheduleCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirmAsync } = useToast();

  const closeMenu = () => {
    setIsMenuOpen(false);
    setMenuPos(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: Math.max(rect.right - 160, 8) });
    setIsMenuOpen(!isMenuOpen);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(task.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeMenu();
    onEdit(task);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (await confirmAsync('Are you sure you want to delete this scheduled task?')) {
      onDelete(task.id);
    }
    closeMenu();
  };

  const handleShowHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeMenu();
    onShowHistory(task);
  };

  const cronDescription = describeCron(task.cron, task.preset);
  const modelDef = getModelDefinition(task.modelId);

  return (
    <div
      className={cn(
        'relative w-full rounded-[10px] transition-all duration-200',
        'bg-card border border-border hover:bg-muted/50 group',
        'flex flex-col gap-2 px-4 py-3',
        isMenuOpen ? 'z-20' : 'z-0'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate">
            {task.title}
          </h3>
          {modelDef && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-muted text-[10px] font-medium text-muted-foreground">
              <HugeiconRenderer icon={AiCloudIcon} size={10} />
              {modelDef.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-3">
          <button
            onClick={handleToggle}
            className={cn(
              'w-9 h-5 rounded-full transition-colors duration-200 relative cursor-pointer',
              task.enabled ? 'bg-primary' : 'bg-muted-foreground/30'
            )}
            aria-label={task.enabled ? 'Disable schedule' : 'Enable schedule'}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm',
                task.enabled && 'translate-x-4'
              )}
            />
          </button>
          <div ref={menuRef}>
            <button
              onClick={toggleMenu}
              className={cn(
                'p-1 hover:bg-muted rounded-[8px] text-muted-foreground transition-all cursor-pointer opacity-0 group-hover:opacity-100',
                isMenuOpen && 'opacity-100 bg-muted'
              )}
              aria-label="Schedule actions"
            >
              <HugeiconRenderer icon={MoreVerticalIcon} size={16} />
            </button>
            {isMenuOpen && menuPos && (
              <div
                className="fixed w-40 bg-card border border-border rounded-xl shadow-xl shadow-black/30 py-1.5 z-[9999]"
                style={{ top: menuPos.top, left: menuPos.left }}
              >
                <button
                  onClick={handleShowHistory}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <HugeiconRenderer icon={HistoryIcon} size={16} className="text-muted-foreground" />
                  <span>View History</span>
                </button>
                <button
                  onClick={handleEdit}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <HugeiconRenderer icon={Edit02Icon} size={16} className="text-muted-foreground" />
                  <span>Edit</span>
                </button>
                <div className="h-px bg-border my-1.5" />
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-900/30 transition-colors cursor-pointer"
                >
                  <HugeiconRenderer icon={Delete02Icon} size={16} className="text-destructive" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <HugeiconRenderer icon={Time03Icon} size={14} />
        <span>{cronDescription}</span>
        {task.enabled && task.nextRunAt && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-blue-400 font-medium">Next: {formatFutureTime(task.nextRunAt)}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {task.lastRunAt ? (
          <>
            <span>Last run: {formatRelativeTime(task.lastRunAt)}</span>
            <HugeiconRenderer icon={CheckmarkCircle02Icon} size={14} className="text-emerald-400" />
            <span className="text-emerald-400">Success</span>
          </>
        ) : (
          <span>No runs yet</span>
        )}
      </div>

      <div className="flex items-center justify-end gap-1 mt-1">
        <button
          onClick={handleShowHistory}
          className="flex items-center gap-1 px-2 py-1 rounded-[8px] text-xs text-muted-foreground hover:bg-muted transition-all cursor-pointer active:scale-[0.99]"
          aria-label="View history"
        >
          <HugeiconRenderer icon={HistoryIcon} size={14} />
          <span>History</span>
        </button>
        <button
          onClick={handleEdit}
          className="flex items-center gap-1 px-2 py-1 rounded-[8px] text-xs text-muted-foreground hover:bg-muted transition-all cursor-pointer active:scale-[0.99]"
          aria-label="Edit task"
        >
          <HugeiconRenderer icon={Edit02Icon} size={14} />
          <span>Edit</span>
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 px-2 py-1 rounded-[8px] text-xs text-red-500 hover:bg-red-900/30 transition-all cursor-pointer active:scale-[0.99]"
          aria-label="Delete task"
        >
          <HugeiconRenderer icon={Delete02Icon} size={14} className="text-red-500" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}
