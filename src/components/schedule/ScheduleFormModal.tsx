import { useState } from 'react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { ScheduledTask, SchedulePreset } from '@/types/schedule';
import { MODELS } from '@core/config/models';

interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; prompt: string; cron: string; preset: SchedulePreset; modelId: string }) => void;
  editTask?: ScheduledTask | null;
}

const presetOptions: { value: SchedulePreset; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
];

const presetCronMap: Record<Exclude<SchedulePreset, 'custom'>, string> = {
  daily: '0 9 * * *',
  weekdays: '0 9 * * 1-5',
  weekly: '0 9 * * 1',
};

export function ScheduleFormModal({ isOpen, onClose, onSave, editTask }: ScheduleFormModalProps) {
  const [title, setTitle] = useState(editTask?.title ?? '');
  const [prompt, setPrompt] = useState(editTask?.prompt ?? '');
  const [preset, setPreset] = useState<SchedulePreset>(editTask?.preset ?? 'daily');
  const [cron, setCron] = useState(editTask?.cron ?? '0 9 * * *');
  const [modelId, setModelId] = useState(editTask?.modelId ?? MODELS[0]?.id ?? '');

  const handlePresetChange = (value: SchedulePreset) => {
    setPreset(value);
    if (value !== 'custom') {
      setCron(presetCronMap[value]);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!title.trim() || !prompt.trim()) return;
    onSave({
      title: title.trim(),
      prompt: prompt.trim(),
      cron,
      preset,
      modelId: modelId || MODELS[0]?.id || 'auto',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-card rounded-[10px] w-[min(520px,95vw)] max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/30 border border-border animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-[18px] font-bold text-foreground">
            {editTask ? 'Edit Schedule' : 'New Schedule'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <HugeiconRenderer icon={Cancel01Icon} size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Title</label>
            <input
              type="text"
              placeholder="e.g. Daily Standup Summary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-muted rounded-[8px] py-3 px-4 text-sm focus:outline-none placeholder:text-muted-foreground border border-border focus:border-ring transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Prompt</label>
            <textarea
              placeholder="Enter the prompt the AI should run..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-muted rounded-[8px] py-3 px-4 text-sm focus:outline-none placeholder:text-muted-foreground border border-border focus:border-ring transition-all min-h-[120px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Frequency</label>
            <div className="flex gap-2">
              {presetOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => handlePresetChange(opt.value)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-[8px] cursor-pointer active:scale-[0.99] transition-all',
                    preset === opt.value
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent/50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Agent / Model</label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full bg-muted rounded-[8px] py-3 px-4 text-sm focus:outline-none text-foreground border border-border focus:border-ring transition-all cursor-pointer"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Cron Expression</label>
            {preset === 'custom' ? (
              <input
                type="text"
                placeholder="* * * * *"
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                className="w-full bg-muted rounded-[8px] py-3 px-4 text-sm focus:outline-none placeholder:text-muted-foreground border border-border focus:border-ring transition-all"
              />
            ) : (
              <div className="w-full bg-muted rounded-[8px] py-3 px-4 text-sm text-foreground border border-border">
                {cron}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-muted text-foreground rounded-[8px] transition-all hover:bg-accent/50 cursor-pointer active:scale-[0.99] select-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium bg-accent text-accent-foreground rounded-[8px] transition-all hover:bg-accent/80 cursor-pointer active:scale-[0.99] select-none"
          >
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
