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
            ? 'thinking-shimmer-text text-sm font-medium cursor-pointer text-white font-inter'
            : 'text-sm font-medium text-white/60 cursor-pointer font-inter'
        }
      >
        {label}
      </span>
    </button>
  );
};
