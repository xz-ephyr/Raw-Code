import { cn, formatRelativeTime } from '@/lib/utils';
import { Play, Trash2, Layers } from 'lucide-react';
import type { Workflow } from '@/types/workflow';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface WorkflowCardProps {
  workflow: Workflow;
  isTemplate?: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onRun?: () => void;
}

export function WorkflowCard({ workflow, isTemplate, onClick, onDelete, onRun }: WorkflowCardProps) {
  const stepCount = workflow.steps.length;
  const types = [...new Set(workflow.steps.map((s) => s.type))];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="group relative border border-border rounded-lg p-3 hover:bg-muted transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Layers size={16} className="text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-foreground truncate block">
                {workflow.title || 'Untitled Workflow'}
              </span>
              {workflow.description && (
                <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {workflow.description}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{stepCount} step{stepCount !== 1 ? 's' : ''}</span>
          {types.length > 0 && (
            <span className="flex items-center gap-1">
              {types.map((t) => (
                <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-muted capitalize">
                  {t.replace('_', ' ')}
                </span>
              ))}
            </span>
          )}
        </div>

        {!isTemplate && workflow.updatedAt > 0 && (
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(workflow.updatedAt)}
          </span>
        )}
      </div>

      <div className={cn(
        'absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
        isTemplate ? 'opacity-100' : ''
      )}>
        {onRun && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); onRun(); }}
                className="p-1.5 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Run workflow"
              >
                <Play size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Run workflow</TooltipContent>
          </Tooltip>
        )}
        {!isTemplate && onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-900/20 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Delete workflow"
              >
                <Trash2 size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Delete workflow</TooltipContent>
          </Tooltip>
        )}
        {isTemplate && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            Template
          </span>
        )}
      </div>
    </div>
  );
}
