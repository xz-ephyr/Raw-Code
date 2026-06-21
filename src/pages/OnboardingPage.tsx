import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useOnboarding, StepId } from '../hooks/useOnboarding';
import { ProgressBar } from '../components/onboarding/ProgressBar';
import { WelcomeStep } from '../components/onboarding/WelcomeStep';
import { ProjectSetupStep } from '../components/onboarding/ProjectSetupStep';
import { ModelSetupStep } from '../components/onboarding/ModelSetupStep';
import { TourStep } from '../components/onboarding/TourStep';
import { ReadyStep } from '../components/onboarding/ReadyStep';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { Project } from '../types/chat';

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const {
    loading,
    completed,
    activeStep,
    stepStatuses,
    goToStep,
    markStepDone,
    markStepSkipped,
    finishOnboarding,
    STEPS,
  } = useOnboarding();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    ChatSessionManager.getProjects().then(setProjects);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (completed) {
    return <Navigate to="/chats" replace />;
  }

  const handleFullSetup = () => {
    markStepDone('welcome');
    goToStep('project');
  };

  const handleQuickStart = async () => {
    await markStepDone('welcome');
    await finishOnboarding();
  };

  const handleStepComplete = (stepId: StepId) => {
    markStepDone(stepId);
    const currentIdx = STEPS.findIndex(s => s.id === stepId);
    const nextStep = STEPS[currentIdx + 1];
    if (nextStep && nextStep.id !== 'ready') {
      goToStep(nextStep.id);
    } else if (nextStep?.id === 'ready') {
      goToStep('ready');
    }
  };

  const handleStepSkip = (stepId: StepId) => {
    markStepSkipped(stepId);
    const currentIdx = STEPS.findIndex(s => s.id === stepId);
    const nextStep = STEPS[currentIdx + 1];
    if (nextStep) {
      goToStep(nextStep.id);
    }
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    await markStepDone('ready');
    await finishOnboarding();
  };

  const handleStepClick = (stepId: StepId) => {
    if (stepId === 'welcome' || stepId === 'ready') return;
    goToStep(stepId);
  };

  const renderStep = () => {
    switch (activeStep) {
      case 'welcome':
        return <WelcomeStep onFullSetup={handleFullSetup} onQuickStart={handleQuickStart} />;
      case 'project':
        return (
          <ProjectSetupStep
            onComplete={() => handleStepComplete('project')}
            onSkip={() => handleStepSkip('project')}
          />
        );
      case 'model':
        return (
          <ModelSetupStep
            onComplete={() => handleStepComplete('model')}
            onSkip={() => handleStepSkip('model')}
          />
        );
      case 'tour':
        return (
          <TourStep
            onComplete={() => handleStepComplete('tour')}
            onSkip={() => handleStepSkip('tour')}
          />
        );
      case 'ready':
        return (
          <ReadyStep
            stepStatuses={stepStatuses}
            projects={projects}
            onFinish={handleFinish}
            isFinishing={isFinishing}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white overflow-y-auto">
      <div className="shrink-0 px-6 py-4 border-b border-neutral-100">
        <div className="max-w-2xl mx-auto">
          <ProgressBar
            steps={STEPS}
            activeStep={activeStep}
            stepStatuses={stepStatuses}
            onStepClick={handleStepClick}
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">{renderStep()}</div>
      </div>
    </div>
  );
};
