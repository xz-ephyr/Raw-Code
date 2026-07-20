import { memo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { WorkflowStep } from '@/types/workflow';
import StepConfigPanel from './StepConfigPanel';

interface WorkflowStepCardProps {
  step: WorkflowStep;
  index: number;
  total: number;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onReorder?: (from: number, to: number) => void;
  onUpdate: (id: string, partial: Partial<WorkflowStep>) => void;
  onToggleCollapse: (id: string) => void;
  isRunning?: boolean;
}

const typeColors: Record<string, string> = {
  tool_call: 'border-l-blue-500 bg-blue-500/5',
  sub_agent: 'border-l-purple-500 bg-purple-500/5',
  connector: 'border-l-green-500 bg-green-500/5',
  llm: 'border-l-amber-500 bg-amber-500/5',
  skill: 'border-l-orange-500 bg-orange-500/5',
  mcp: 'border-l-teal-500 bg-teal-500/5',
};

const statusDots: Record<string, string> = {
  idle: 'bg-muted-foreground/30',
  running: 'bg-blue-500 animate-pulse',
  success: 'bg-green-500',
  error: 'bg-red-500',
};

const WorkflowStepCard = memo(function WorkflowStepCard({
  step,
  index,
  total,
  onRemove,
  onMoveUp,
  onMoveDown,
  onReorder,
  onUpdate,
  onToggleCollapse,
  isRunning,
}: WorkflowStepCardProps) {
  return (
    <div
      draggable
      className={cn(
        'group border border-border rounded-lg border-l-[3px] transition-colors',
        typeColors[step.type] ?? 'border-l-border'
      )}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(index));
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData('text/plain'));
        if (from !== index) {
          onReorder?.(from, index);
        }
      }}
    >
      <div
        onClick={() => onToggleCollapse(step.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCollapse(step.id); } }}
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        <div className="flex items-center gap-0.5 shrink-0 opacity-30 hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(index); }}
            disabled={index === 0 || isRunning}
            className={cn('p-0.5 rounded transition-colors focus-visible:ring-2 focus-visible:ring-ring', (index === 0 || isRunning) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted')}
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(index); }}
            disabled={index === total - 1 || isRunning}
            className={cn('p-0.5 rounded transition-colors focus-visible:ring-2 focus-visible:ring-ring', (index === total - 1 || isRunning) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted')}
          >
            <ChevronDown size={12} />
          </button>
        </div>

        <span className={cn('w-2 h-2 rounded-full shrink-0', statusDots[step.status])} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {step.label ? (
              <input
                value={step.label}
                onChange={(e) => onUpdate(step.id, { label: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium text-foreground bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-ring rounded truncate min-w-0"
              />
            ) : (
              <span className="text-xs font-medium text-foreground truncate">Untitled Step</span>
            )}
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize shrink-0">
              {step.type.replace('_', ' ')}
            </span>
          </div>
          {step.description && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">{step.description}</div>
          )}
          {step.status === 'success' && typeof step.output !== 'undefined' && (
            <div className="text-xs text-green-600 dark:text-green-400 mt-0.5 font-mono truncate">
              {`${JSON.stringify(step.output)}`}
            </div>
          )}
          {step.status === 'error' && step.error && (
            <div className="text-xs text-red-500 mt-0.5 truncate">{step.error}</div>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(step.id); }}
              className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-900/20 transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Remove step"
            >
              <Trash2 size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Remove step</TooltipContent>
        </Tooltip>
      </div>

      {!step.collapsed && (
        <div className="px-3 pb-3 pt-1 border-t border-border/50">
          <StepConfigPanel step={step} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
});

export default WorkflowStepCard;
