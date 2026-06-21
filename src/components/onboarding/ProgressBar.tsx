import { StepId, StepInfo, StepStatus } from '../../hooks/useOnboarding';

interface ProgressBarProps {
  steps: StepInfo[];
  activeStep: StepId;
  stepStatuses: Record<StepId, StepStatus>;
  onStepClick: (stepId: StepId) => void;
}

export function ProgressBar({ steps, activeStep, stepStatuses, onStepClick }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const status = stepStatuses[step.id];
        const isActive = step.id === activeStep;
        const isDone = status === 'done';
        const isSkipped = status === 'skipped';

        let dotClass = 'bg-neutral-200';
        if (isDone) dotClass = 'bg-green-500';
        else if (isSkipped) dotClass = 'bg-neutral-400';
        if (isActive) dotClass = 'bg-black';

        return (
          <div key={step.id} className="flex items-center gap-2">
            {i > 0 && <div className="w-6 h-px bg-neutral-200" />}
            <button
              onClick={() => onStepClick(step.id)}
              className="flex items-center gap-2 group"
            >
              <div className={`w-2.5 h-2.5 rounded-full transition-colors ${dotClass}`} />
              <span
                className={`text-xs font-medium transition-colors hidden sm:inline ${
                  isActive ? 'text-black' : 'text-neutral-400 group-hover:text-neutral-600'
                }`}
              >
                {step.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
