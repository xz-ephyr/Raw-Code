import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp02Icon, StopIcon } from '@hugeicons/core-free-icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface SendButtonProps {
  isLoading?: boolean;
  onStop?: () => void;
  onSend: () => void;
  hasValue: boolean;
}

export default function SendButton({ isLoading, onStop, onSend, hasValue }: SendButtonProps) {
  const label = isLoading ? 'Stop generation' : 'Send message';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={isLoading ? onStop : onSend}
          disabled={!hasValue && !isLoading}
          className="flex items-center justify-center w-7 h-7 text-background rounded-[8px] bg-foreground disabled:opacity-50 transition-opacity hover:opacity-90 active:scale-95"
          aria-label={label}
        >
          <HugeiconsIcon
            icon={isLoading ? StopIcon : ArrowUp02Icon}
            size={16}
            color="currentColor"
            strokeWidth={1.5}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
