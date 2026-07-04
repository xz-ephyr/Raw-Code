import { useThinkingTimer } from '@/hooks/useThinkingTimer';

interface ThoughtLabelProps {
  isActivelyThinking: boolean;
  isOpen: boolean;
  onClick: () => void;
}

export const ThoughtLabel = ({
  isActivelyThinking,
  isOpen,
  onClick,
}: ThoughtLabelProps) => {
  const { label } = useThinkingTimer(isActivelyThinking);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center bg-transparent p-0 text-left outline-none w-fit transition-all"
      aria-expanded={isOpen}
    >
      <span
        className={
          isActivelyThinking
            ? 'thinking-shimmer-text text-base font-medium cursor-pointer'
            : 'text-base font-medium text-neutral-400 cursor-pointer'
        }
      >
        {label}
      </span>
    </button>
  );
};
