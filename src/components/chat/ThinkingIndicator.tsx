import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Idea01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { useThinkingTimer } from '@/hooks/useThinkingTimer';

interface ThinkingIndicatorProps {
  model?: string;
  reasoning?: string;
}

export function ThinkingIndicator({ model, reasoning }: ThinkingIndicatorProps) {
  const isActivelyThinking = !reasoning;
  const { label } = useThinkingTimer(isActivelyThinking);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (reasoning) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsExpanded(false);
    }
  }, [reasoning]);

  return (
    <div className="py-2 text-sm text-neutral-700" role="status" aria-live="polite">
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        className="group flex items-center gap-2.5 rounded-md bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 w-fit transition-opacity hover:opacity-80"
        aria-label={isExpanded ? 'Hide reasoning process' : 'Show reasoning process'}
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 border border-blue-100">
           <HugeiconsIcon icon={Idea01Icon} size={14} className="text-blue-600 animate-pulse" />
        </div>
        <span className="text-[15px] font-medium text-neutral-600">
           {label}
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={14}
          className={`text-neutral-400 transition-transform duration-300 ${
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
          <div className="max-w-[720px] rounded-lg border border-neutral-200/60 bg-[#fafafa] px-5 py-4 text-[15px] leading-relaxed text-neutral-600 shadow-sm relative">
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
              <p className="mt-3 pt-3 border-t border-neutral-200/60 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                Model: {model}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
