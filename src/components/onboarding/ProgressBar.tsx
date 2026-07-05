import { StepId, StepInfo, StepStatus } from '@/hooks/useOnboarding';

interface ProgressBarProps {
  steps: StepInfo[];
  activeStep: StepId;
  stepStatuses: Record<StepId, StepStatus>;
}

export function ProgressBar({ steps, activeStep, stepStatuses }: ProgressBarProps) {
  return (
    <div className="flex items-start justify-center">
      {steps.map((step, i) => {
        const status = stepStatuses[step.id];
        const isActive = step.id === activeStep;
        const isDone = status === 'done';

        return (
          <div key={step.id} className="flex flex-col items-center">
            <div className="flex items-center">
              {i > 0 && (
                <div className={`w-8 h-0.5 ${isDone ? 'bg-green-400' : 'bg-muted'}`} />
              )}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isDone
                    ? 'bg-green-500'
                    : isActive
                      ? 'bg-foreground'
                      : 'bg-muted'
                }`}
              >
                {isDone && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span
              className={`text-[11px] font-medium whitespace-nowrap leading-none mt-1.5 ${
                isActive ? 'text-foreground' : isDone ? 'text-green-400' : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
