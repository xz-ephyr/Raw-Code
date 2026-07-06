import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Idea01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { useThinkingTimer } from '@/hooks/useThinkingTimer';

interface ThinkingIndicatorProps {
  model?: string;
  reasoning?: string;
}

/**
 * @deprecated Use ThinkingTimeline instead. Kept for backward compatibility.
 */
export function ThinkingIndicator({ model, reasoning }: ThinkingIndicatorProps) {
  const isActivelyThinking = !reasoning;
  const { label } = useThinkingTimer(isActivelyThinking);
  const [isExpanded, setIsExpanded] = useState(!reasoning);

  return (
    <div className="py-2 text-sm text-foreground" role="status" aria-live="polite">
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        className="group flex items-center gap-2.5 rounded-md bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring w-fit transition-opacity hover:opacity-80"
        aria-label={isExpanded ? 'Hide reasoning process' : 'Show reasoning process'}
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-900/30 border border-blue-800">
           <HugeiconsIcon icon={Idea01Icon} size={14} className="text-blue-400 animate-pulse" />
        </div>
        <span className="text-[15px] font-medium text-muted-foreground">
           {label}
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={14}
          className={`text-muted-foreground transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      <div 
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="max-w-[720px] rounded-lg border border-border/60 bg-card px-5 py-4 text-[15px] leading-relaxed text-muted-foreground shadow-sm relative">
            <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-blue-500 rounded-r-full" />
            <div className="h-[45px] overflow-y-auto no-scrollbar thinking-pad-mask relative flex flex-col gap-2 pt-1">
              {reasoning ? (
                <div className="whitespace-pre-wrap animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {reasoning}
                </div>
              ) : (
                <p className="animate-pulse">Waiting for the first response token from the model...</p>
              )}
            </div>
            {model && (
              <p className="mt-3 pt-3 border-t border-border/60 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Model: {model}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
