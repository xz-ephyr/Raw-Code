import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, Key01Icon, FolderLibraryIcon } from '@hugeicons/core-free-icons';
import { StepStatus } from '@/hooks/useOnboarding';

interface ReadyStepProps {
  stepStatuses: Record<string, StepStatus>;
  onFinish: () => void;
  isFinishing: boolean;
}

export function ReadyStep({ stepStatuses, onFinish, isFinishing }: ReadyStepProps) {
  const hasModel = stepStatuses['model'] === 'done';
  const hasPreferences = stepStatuses['preferences'] === 'done';

  const items = [
    { label: 'Connected', done: true, icon: FolderLibraryIcon },
    { label: 'AI provider configured', done: hasModel, icon: Key01Icon },
    { label: 'AI preferences set', done: hasPreferences, icon: CheckmarkCircle01Icon },
  ];

  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto gap-8 py-8">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={32} className="text-green-600" strokeWidth={1.5} />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">You're all set!</h1>
        <p className="text-muted-foreground text-sm">
          Everything is ready. Start your first conversation with the AI.
        </p>
      </div>

      <div className="w-full space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left ${
              item.done
                ? 'border-green-200 bg-green-900/20'
                : 'border-border bg-muted/50'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                item.done ? 'bg-green-900/30 text-green-400' : 'bg-muted text-muted-foreground'
              }`}
            >
              <HugeiconsIcon icon={item.icon} size={16} strokeWidth={1.5} />
            </div>
            <div>
              <div
                className={`text-sm font-medium ${
                  item.done ? 'text-green-400' : 'text-muted-foreground'
                }`}
              >
                {item.done ? 'Done' : 'Skipped'} — {item.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onFinish}
        disabled={isFinishing}
        className="w-full max-w-xs py-3 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/80 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isFinishing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Setting up...
          </>
        ) : (
          'Start creating'
        )}
      </button>
    </div>
  );
}
