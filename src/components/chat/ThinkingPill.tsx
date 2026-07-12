import { HugeiconsIcon } from '@hugeicons/react';
import { Atom02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

interface ThinkingPillProps {
  onToggleThinking: () => void;
  size?: 'normal' | 'small';
}

export default function ThinkingPill({ onToggleThinking, size = 'normal' }: ThinkingPillProps) {
  return (
    <button
      type="button"
      onClick={onToggleThinking}
      className={`group flex items-center gap-2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 ${size === 'normal' ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs'} rounded-[6px] font-medium cursor-pointer transition-all active:scale-95`}
      aria-label="Disable thinking mode"
      title="Disable thinking mode"
    >
      <div className={`relative flex items-center justify-center ${size === 'normal' ? 'w-4 h-4' : 'w-3.5 h-3.5'}`}>
        <HugeiconsIcon icon={Atom02Icon} size={size === 'normal' ? 16 : 14} className="group-hover:hidden" />
        <HugeiconsIcon icon={Cancel01Icon} size={size === 'normal' ? 16 : 14} className="hidden group-hover:block" />
      </div>
      Reasoning
    </button>
  );
}
