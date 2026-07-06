import { AlarmClockIcon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';

interface ScheduleEmptyStateProps {
  onCreateClick: () => void;
}

export function ScheduleEmptyState({ onCreateClick }: ScheduleEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-foreground mb-6 border border-border shadow-sm">
        <HugeiconRenderer icon={AlarmClockIcon} size={36} />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        Your schedule is empty
      </h3>
      <p className="text-sm text-muted-foreground max-w-[320px] leading-relaxed">
        Create scheduled prompts for the AI to run automatically — daily standups, weekly reports, etc.
      </p>
      <button
        onClick={onCreateClick}
        className="mt-8 px-6 py-2.5 bg-accent text-accent-foreground text-sm font-semibold rounded-[8px] transition-all hover:bg-accent/80 cursor-pointer active:scale-[0.99] transition-transform"
      >
        + Create your first schedule
      </button>
    </div>
  );
}
