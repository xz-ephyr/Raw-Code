import { useWorkflowStore } from '@/stores/workflowStore';
import { useWorkflowRunner } from '@/hooks/useWorkflowRunner';
import { ArrowLeft, Play, Square, RotateCcw } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import WorkflowStepCard from './WorkflowStepCard';
import AddStepDropdown from './AddStepDropdown';

interface WorkflowEditorProps {
  workflowId: string;
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps) {
  const workflow = useWorkflowStore((s) => s.workflows.find((w) => w.id === workflowId));
  const renameWorkflow = useWorkflowStore((s) => s.renameWorkflow);
  const setActiveWorkflow = useWorkflowStore((s) => s.setActiveWorkflow);
  const addStep = useWorkflowStore((s) => s.addStep);
  const removeStep = useWorkflowStore((s) => s.removeStep);
  const reorderSteps = useWorkflowStore((s) => s.reorderSteps);
  const updateStep = useWorkflowStore((s) => s.updateStep);
  const toggleStepCollapse = useWorkflowStore((s) => s.toggleStepCollapse);
  const { isRunning, start, stop, reset } = useWorkflowRunner();

  if (!workflow) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-sm text-muted-foreground mb-4">Workflow not found.</div>
        <button
          onClick={() => setActiveWorkflow(null)}
          className="text-sm font-medium text-foreground hover:underline"
        >
          Back to workflows
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveWorkflow(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:bg-sidebar rounded-lg px-2 py-1 -ml-2 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to home</span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <input
          value={workflow.title}
          onChange={(e) => renameWorkflow(workflow.id, e.target.value)}
          className="text-2xl font-semibold text-foreground bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-ring rounded w-full"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          {isRunning ? (
            <button
              onClick={() => stop()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <Square size={14} />
              Stop
            </button>
          ) : (
            <button
              onClick={() => start(workflow)}
              disabled={workflow.steps.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Play size={14} />
              Run
            </button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => reset(workflow.id)}
                disabled={isRunning}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RotateCcw size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Reset</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="space-y-2">
        <AddStepDropdown onSelect={(type) => addStep(workflow.id, type)} />

        {workflow.steps.map((step, i) => (
          <WorkflowStepCard
            key={step.id}
            step={step}
            index={i}
            total={workflow.steps.length}
            onRemove={(id) => removeStep(workflow.id, id)}
            onMoveUp={(idx) => {
              if (idx > 0) reorderSteps(workflow.id, idx, idx - 1);
            }}
            onMoveDown={(idx) => {
              if (idx < workflow.steps.length - 1) reorderSteps(workflow.id, idx, idx + 1);
            }}
            onReorder={(from, to) => reorderSteps(workflow.id, from, to)}
            onUpdate={(id, partial) => updateStep(workflow.id, id, partial)}
            onToggleCollapse={(id) => toggleStepCollapse(workflow.id, id)}
            isRunning={isRunning}
          />
        ))}

        {workflow.steps.length > 0 && (
          <AddStepDropdown onSelect={(type) => addStep(workflow.id, type)} />
        )}
      </div>
    </div>
  );
}
