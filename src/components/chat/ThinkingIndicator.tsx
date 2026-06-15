import { useState } from 'react';

interface ThinkingIndicatorProps {
  model?: string;
}

export function ThinkingIndicator({ model }: ThinkingIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="py-4 text-sm text-neutral-700" role="status" aria-live="polite">
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        className="group flex items-center gap-2 rounded-md bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
        aria-label={isExpanded ? 'Hide response status' : 'Show response status'}
      >
        <span className="thinking-shimmer-text text-xl font-medium">Thinking...</span>
        <span
          className={`flex h-6 w-6 items-center justify-center text-neutral-900 transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`}
          aria-hidden="true"
        >
          <span className="h-2.5 w-2.5 rotate-45 border-b-2 border-r-2 border-current" />
        </span>
      </button>

      {isExpanded && (
        <div className="mt-3 max-w-md rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-500">
          <p>Waiting for the first response token from the model.</p>
          {model && <p className="mt-1 text-neutral-600">Model: {model}</p>}
        </div>
      )}
    </div>
  );
}
