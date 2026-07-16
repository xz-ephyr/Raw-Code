import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Workflow, WorkflowStep, StepType, WorkflowMode } from '@/types/workflow';

interface WorkflowState {
  workflows: Workflow[];
  activeWorkflowId: string | null;
  mode: WorkflowMode;

  setMode: (mode: WorkflowMode) => void;
  createWorkflow: (template?: Workflow) => string;
  deleteWorkflow: (id: string) => void;
  setActiveWorkflow: (id: string | null) => void;
  addStep: (workflowId: string, type: StepType) => void;
  removeStep: (workflowId: string, stepId: string) => void;
  reorderSteps: (workflowId: string, fromIndex: number, toIndex: number) => void;
  updateStep: (workflowId: string, stepId: string, partial: Partial<WorkflowStep>) => void;
  toggleStepCollapse: (workflowId: string, stepId: string) => void;
  renameWorkflow: (id: string, title: string) => void;
  updateWorkflow: (id: string, patch: Partial<Workflow>) => void;
  resetStepStatuses: (workflowId: string) => void;
}

function createStep(type: StepType, index: number): WorkflowStep {
  const labels: Record<StepType, string> = {
    tool_call: 'Tool Call',
    sub_agent: 'Sub-agent',
    connector: 'Connector',
    llm: 'LLM',
    skill: 'Skill',
    mcp: 'MCP',
    video_edit: 'Video Edit',
  };
  return {
    id: crypto.randomUUID(),
    type,
    label: `${labels[type]} ${index + 1}`,
    config: {},
    collapsed: true,
    status: 'idle',
  };
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      workflows: [],
      activeWorkflowId: null,
      mode: 'gallery',

      setMode: (mode) => set({ mode }),

      createWorkflow: (template) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const workflow: Workflow = template
          ? {
              ...template,
              id,
              createdAt: now,
              updatedAt: now,
              steps: template.steps.map((s) => ({ ...s, id: crypto.randomUUID(), status: 'idle' as const, collapsed: true })),
            }
          : { id, title: 'Untitled Workflow', steps: [], createdAt: now, updatedAt: now };
        set((state) => ({ workflows: [...state.workflows, workflow], activeWorkflowId: id, mode: 'editor' }));
        return id;
      },

      deleteWorkflow: (id) =>
        set((state) => ({
          workflows: state.workflows.filter((w) => w.id !== id),
          activeWorkflowId: state.activeWorkflowId === id ? null : state.activeWorkflowId,
        })),

      setActiveWorkflow: (id) => set({ activeWorkflowId: id, mode: id ? 'editor' : 'gallery' }),

      addStep: (workflowId, type) =>
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === workflowId
              ? { ...w, steps: [...w.steps, createStep(type, w.steps.length)], updatedAt: Date.now() }
              : w
          ),
        })),

      removeStep: (workflowId, stepId) =>
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === workflowId
              ? { ...w, steps: w.steps.filter((s) => s.id !== stepId), updatedAt: Date.now() }
              : w
          ),
        })),

      reorderSteps: (workflowId, fromIndex, toIndex) =>
        set((state) => ({
          workflows: state.workflows.map((w) => {
            if (w.id !== workflowId) return w;
            const steps = [...w.steps];
            const [moved] = steps.splice(fromIndex, 1);
            steps.splice(toIndex, 0, moved);
            return { ...w, steps, updatedAt: Date.now() };
          }),
        })),

      updateStep: (workflowId, stepId, partial) =>
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === workflowId
              ? {
                  ...w,
                  steps: w.steps.map((s) => (s.id === stepId ? { ...s, ...partial } : s)),
                  updatedAt: Date.now(),
                }
              : w
          ),
        })),

      toggleStepCollapse: (workflowId, stepId) =>
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === workflowId
              ? {
                  ...w,
                  steps: w.steps.map((s) => (s.id === stepId ? { ...s, collapsed: !s.collapsed } : s)),
                }
              : w
          ),
        })),

      renameWorkflow: (id, title) =>
        set((state) => ({
          workflows: state.workflows.map((w) => (w.id === id ? { ...w, title, updatedAt: Date.now() } : w)),
        })),

      updateWorkflow: (id, patch) =>
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === id ? { ...w, ...patch, updatedAt: Date.now() } : w
          ),
        })),

      resetStepStatuses: (workflowId) =>
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === workflowId
              ? {
                  ...w,
                  steps: w.steps.map((s) => ({ ...s, status: 'idle' as const, output: undefined, error: undefined })),
                }
              : w
          ),
        })),
    }),
    {
      name: 'doktor-workflow-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        workflows: state.workflows.map((w) => ({
          ...w,
          steps: w.steps.map(({ status: _, output: _o, error: _e, ...rest }) => rest),
        })),
        activeWorkflowId: state.activeWorkflowId,
        mode: state.mode,
      }),
      migrate: (persisted: any, _version: number) => ({
        ...persisted,
        workflows: (persisted?.workflows || []).map((w: any) => ({
          title: 'Untitled Workflow',
          description: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          steps: [],
          ...w,
        })),
        mode: persisted?.mode === 'editor' || persisted?.mode === 'gallery' ? persisted.mode : 'gallery',
      }),
    }
  )
);
