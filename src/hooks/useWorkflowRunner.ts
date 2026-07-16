import { useState, useCallback, useRef } from 'react';
import { emit } from '@doktor/tool-runtime';
import type { Workflow } from '@/types/workflow';
import { useWorkflowStore } from '@/stores/workflowStore';

export interface StepResult {
  stepId: string;
  status: 'running' | 'success' | 'error';
  output?: unknown;
  error?: string;
}

export function useWorkflowRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
  const abortRef = useRef(false);
  const updateStep = useWorkflowStore((s) => s.updateStep);
  const resetStepStatuses = useWorkflowStore((s) => s.resetStepStatuses);

  const mockOutputs: Record<string, unknown> = {
    tool_call: { result: 'Operation completed successfully.', data: { items: ['sample result 1', 'sample result 2'] } },
    sub_agent: { output: 'Agent completed analysis.', summary: 'Key findings extracted.' },
    connector: { status: 'published', url: 'https://example.com/post/123' },
    video_edit: { jobId: 'sim-job-123', status: 'completed', workflowUrl: 'https://github.com/user/repo/actions/runs/1' },
    llm: { generated: 'Sample generated content based on the configured model.' },
    skill: { activated: true, features: ['feature-a', 'feature-b'] },
    mcp: { result: 'MCP tool executed (simulated).' },
  };

  const delay = (ms: number) => new Promise<void>((r) => {
    const timer = setTimeout(r, ms);
    const check = () => { if (abortRef.current) { clearTimeout(timer); r(); } };
    const interval = setInterval(check, 50);
    Promise.resolve().then(() => { clearInterval(interval); });
  });

  const start = useCallback(async (workflow: Workflow) => {
    abortRef.current = false;
    setIsRunning(true);
    resetStepStatuses(workflow.id);

    const sessionID = workflow.id;

    for (let i = 0; i < workflow.steps.length; i++) {
      if (abortRef.current) break;
      const step = workflow.steps[i];
      setCurrentStepIndex(i);
      updateStep(workflow.id, step.id, { status: 'running' });

      emit({
        type: 'tool_call_start',
        sessionID,
        agentID: step.type,
        timestamp: Date.now(),
        payload: { toolName: step.label, description: step.description ?? '' },
      });

      const stepDelay = 800 + Math.random() * 1200;
      await delay(stepDelay);

      if (abortRef.current) break;

      const shouldFail = Math.random() < 0.05;
      if (shouldFail) {
        const errMsg = 'Simulated error: step failed.';
        updateStep(workflow.id, step.id, { status: 'error', error: errMsg });
        emit({
          type: 'error',
          sessionID,
          agentID: step.type,
          timestamp: Date.now(),
          payload: { message: errMsg, toolName: step.label },
        });
        break;
      }

      const output = mockOutputs[step.type] ?? { result: 'Step completed.' };
      updateStep(workflow.id, step.id, {
        status: 'success',
        output,
      });

      emit({
        type: 'tool_call_end',
        sessionID,
        agentID: step.type,
        timestamp: Date.now(),
        payload: { toolName: step.label, result: output as Record<string, unknown> },
      });
    }

    setIsRunning(false);
    setCurrentStepIndex(null);
  }, [updateStep, resetStepStatuses]);

  const stop = useCallback(() => {
    abortRef.current = true;
    setIsRunning(false);
    setCurrentStepIndex(null);
  }, []);

  const reset = useCallback((workflowId: string) => {
    abortRef.current = true;
    setIsRunning(false);
    setCurrentStepIndex(null);
    resetStepStatuses(workflowId);
  }, [resetStepStatuses]);

  return { isRunning, currentStepIndex, start, stop, reset };
}
