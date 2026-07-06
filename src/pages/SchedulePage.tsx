import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search01Icon, Add01Icon } from '@hugeicons/core-free-icons';
import { ScheduledTask, ScheduledTaskRun } from '@/types/schedule';
import { ScheduledTaskManager } from '@/services/ScheduledTaskManager';
import { ScheduleCard } from '../components/schedule/ScheduleCard';
import { ScheduleFormModal } from '../components/schedule/ScheduleFormModal';
import { RunHistoryPanel } from '../components/schedule/RunHistoryPanel';
import { ScheduleEmptyState } from '../components/schedule/ScheduleEmptyState';

import { HugeiconRenderer } from '../components/ui/HugeiconRenderer';
import { PageGradient } from '@/components/ui/PageGradient';

export const SchedulePage = () => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [historyTask, setHistoryTask] = useState<ScheduledTask | null>(null);
  const [historyRuns, setHistoryRuns] = useState<ScheduledTaskRun[]>([]);

  const refreshTasks = useCallback(async () => {
    const all = await ScheduledTaskManager.getAll();
    setTasks(all);
  }, []);

  useEffect(() => {
    ScheduledTaskManager.getAll().then(all => setTasks(all));
  }, []);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return tasks
      .filter((task) => {
        if (!query) return true;
        return (
          task.title.toLowerCase().includes(query) ||
          task.prompt.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
        return b.createdAt - a.createdAt;
      });
  }, [tasks, searchQuery]);

  const handleAdd = useCallback(() => {
    setEditingTask(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((task: ScheduledTask) => {
    setEditingTask(task);
    setIsFormOpen(true);
  }, []);

  const handleSave = useCallback(async (data: { title: string; prompt: string; cron: string; preset: 'daily' | 'weekdays' | 'weekly' | 'custom'; modelId: string }) => {
    if (editingTask) {
      await ScheduledTaskManager.update(editingTask.id, data);
    } else {
      await ScheduledTaskManager.create(data);
    }
    setIsFormOpen(false);
    setEditingTask(null);
    await refreshTasks();
  }, [editingTask, refreshTasks]);

  const handleDelete = useCallback(async (id: string) => {
    await ScheduledTaskManager.delete(id);
    await refreshTasks();
  }, [refreshTasks]);

  const handleToggle = useCallback(async (id: string) => {
    await ScheduledTaskManager.toggleEnabled(id);
    await refreshTasks();
  }, [refreshTasks]);

  const handleShowHistory = useCallback(async (task: ScheduledTask) => {
    const runs = await ScheduledTaskManager.getRuns(task.id);
    setHistoryRuns(runs);
    setHistoryTask(task);
  }, []);

  const handleCloseHistory = useCallback(() => {
    setHistoryTask(null);
    setHistoryRuns([]);
  }, []);

  return (
    <div className="flex-1 bg-background overflow-y-auto thin-scrollbar relative">
      <PageGradient />
      <div className="mx-auto px-6 py-12 relative z-10" style={{ maxWidth: 'min(800px, 100%)' }}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Schedule</h1>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground text-sm font-semibold rounded-[8px] transition-all hover:bg-accent/80 active:scale-95 cursor-pointer"
          >
            <HugeiconRenderer icon={Add01Icon} size={18} />
            <span>Add</span>
          </button>
        </div>

        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <HugeiconRenderer icon={Search01Icon} size={20} />
          </div>
          <input
            type="text"
            placeholder="Search schedules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted rounded-[8px] py-3 pl-12 pr-4 text-sm focus:outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mt-6 space-y-3">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <ScheduleCard
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onShowHistory={handleShowHistory}
              />
            ))
          ) : (
            <ScheduleEmptyState onCreateClick={handleAdd} />
          )}
        </div>
      </div>

      <ScheduleFormModal
        key={editingTask?.id ?? 'create'}
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingTask(null); }}
        onSave={handleSave}
        editTask={editingTask}
      />

      {historyTask && (
        <RunHistoryPanel
          task={historyTask}
          runs={historyRuns}
          isOpen={true}
          onClose={handleCloseHistory}
        />
      )}
    </div>
  );
};
