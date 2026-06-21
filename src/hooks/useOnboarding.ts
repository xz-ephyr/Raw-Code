import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatabaseService } from '../services/DatabaseService';
import { ChatSessionManager } from '../services/ChatSessionManager';

export type StepId = 'welcome' | 'project' | 'model' | 'tour' | 'ready';

export interface StepInfo {
  id: StepId;
  label: string;
  description: string;
  optional: boolean;
}

export const STEPS: StepInfo[] = [
  { id: 'welcome', label: 'Welcome', description: 'Get started with XZ', optional: false },
  { id: 'project', label: 'Project', description: 'Connect your codebase', optional: true },
  { id: 'model', label: 'AI Model', description: 'Configure your AI provider', optional: true },
  { id: 'tour', label: 'Tour', description: 'Learn the interface', optional: true },
  { id: 'ready', label: 'Ready', description: 'You\'re all set', optional: false },
];

type StepStatus = 'pending' | 'done' | 'skipped';

function configKey(stepId: StepId): string {
  return `onboarding_step_${stepId}`;
}

export const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export function useOnboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [activeStep, setActiveStep] = useState<StepId>('welcome');
  const [stepStatuses, setStepStatuses] = useState<Record<StepId, StepStatus>>({
    welcome: 'pending',
    project: 'pending',
    model: 'pending',
    tour: 'pending',
    ready: 'pending',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const done = await DatabaseService.getConfig(ONBOARDING_COMPLETED_KEY);
        if (done === 'true') {
          setCompleted(true);
          setLoading(false);
          return;
        }

        const statuses: Record<StepId, StepStatus> = { ...stepStatuses };
        for (const step of STEPS) {
          const val = await DatabaseService.getConfig(configKey(step.id));
          if (val === 'done') statuses[step.id] = 'done';
          else if (val === 'skipped') statuses[step.id] = 'skipped';
        }
        setStepStatuses(statuses);

        const firstPending = STEPS.find(s => statuses[s.id] === 'pending');
        if (firstPending) setActiveStep(firstPending.id);
      } catch {
        // fallback: start fresh
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const goToStep = useCallback((stepId: StepId) => {
    setActiveStep(stepId);
  }, []);

  const markStepDone = useCallback(async (stepId: StepId) => {
    await DatabaseService.setConfig(configKey(stepId), 'done');
    setStepStatuses(prev => ({ ...prev, [stepId]: 'done' }));
  }, []);

  const markStepSkipped = useCallback(async (stepId: StepId) => {
    await DatabaseService.setConfig(configKey(stepId), 'skipped');
    setStepStatuses(prev => ({ ...prev, [stepId]: 'skipped' }));
  }, []);

  const currentIndex = STEPS.findIndex(s => s.id === activeStep);
  const totalSteps = STEPS.length;
  const doneCount = STEPS.filter(s => stepStatuses[s.id] === 'done' || stepStatuses[s.id] === 'skipped').length;

  const canGoNext = currentIndex < totalSteps - 1;
  const canGoPrev = currentIndex > 0;

  const goNext = useCallback(() => {
    if (canGoNext) setActiveStep(STEPS[currentIndex + 1].id);
  }, [canGoNext, currentIndex]);

  const goPrev = useCallback(() => {
    if (canGoPrev) setActiveStep(STEPS[currentIndex - 1].id);
  }, [canGoPrev, currentIndex]);

  const requiredStepsDone = STEPS
    .filter(s => !s.optional)
    .every(s => stepStatuses[s.id] === 'done');

  const finishOnboarding = useCallback(async () => {
    const session = await ChatSessionManager.create('My first conversation');
    await DatabaseService.setConfig(ONBOARDING_COMPLETED_KEY, 'true');
    setCompleted(true);
    navigate(`/thread/${session.id}`, { replace: true });
  }, [navigate]);

  return {
    loading,
    completed,
    activeStep,
    stepStatuses,
    currentIndex,
    totalSteps,
    doneCount,
    canGoNext,
    canGoPrev,
    goToStep,
    goNext,
    goPrev,
    markStepDone,
    markStepSkipped,
    requiredStepsDone,
    finishOnboarding,
    STEPS,
  };
}
