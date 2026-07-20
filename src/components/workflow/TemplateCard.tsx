import { Plus } from 'lucide-react';
import { HugeiconRenderer } from '@/components/ui/HugeiconRenderer';
import { PencilEdit02Icon, QuillWrite02Icon, GlobeIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { Workflow } from '@/types/workflow';

const TEMPLATE_ICONS: Record<string, any> = {
  'tpl-blog': PencilEdit02Icon,
  'tpl-video': QuillWrite02Icon,
  'tpl-social': GlobeIcon,
  'tpl-research': Search01Icon,
};

interface TemplateCardProps {
  template: Workflow;
  onClick: () => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const stepCount = template.steps.length;
  const types = [...new Set(template.steps.map((s) => s.type))];
  const Icon = TEMPLATE_ICONS[template.id] || PencilEdit02Icon;

  return (
    <button
      onClick={onClick}
      className="h-[100px] border border-border rounded-lg p-3 flex flex-col text-left bg-sidebar hover:bg-muted transition-colors cursor-pointer relative"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <HugeiconRenderer icon={Icon} size={12} className="text-muted-foreground" />
          </div>
          <span className="text-xs font-semibold text-foreground truncate">{template.title}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="absolute top-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
            >
              <Plus size={11} className="text-foreground" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Use template</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[11px] text-muted-foreground/60">{stepCount} step{stepCount !== 1 ? 's' : ''}</span>
        {types.length > 0 && (
          <span className="flex items-center gap-1">
            {types.map((t) => (
              <span key={t} className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground/70 capitalize">
                {t.replace('_', ' ')}
              </span>
            ))}
          </span>
        )}
      </div>
      {template.description && (
        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
      )}
    </button>
  );
}
