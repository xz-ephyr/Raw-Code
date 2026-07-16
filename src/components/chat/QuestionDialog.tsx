import { useState, useRef, useEffect } from 'react';

interface QuestionDialogProps {
  question: string;
  options: string[] | null;
  allowCustom: boolean;
  onAnswer: (answer: string) => void;
  onDismiss: () => void;
}

export function QuestionDialog({ question, options, allowCustom, onAnswer, onDismiss }: QuestionDialogProps) {
  const [customAnswer, setCustomAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!options || options.length === 0) {
      inputRef.current?.focus();
    }
  }, [options]);

  const handleSubmit = () => {
    const answer = selectedOption || customAnswer.trim();
    if (!answer) return;
    onAnswer(answer);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex items-start gap-3 px-4 py-3 rounded-lg border border-purple-500/30 bg-purple-500/5 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-sm text-foreground font-medium">{question}</p>

        {options && options.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setSelectedOption(opt);
                  setCustomAnswer('');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  selectedOption === opt
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-sidebar text-foreground border-border hover:bg-muted'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {(!options || options.length === 0 || (allowCustom && !selectedOption)) && (
          <input
            ref={inputRef}
            type="text"
            value={customAnswer}
            onChange={(e) => {
              setCustomAnswer(e.target.value);
              setSelectedOption(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-sidebar text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-purple-500/40 transition-shadow"
          />
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={!selectedOption && !customAnswer.trim()}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Submit
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
