import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface ConnectorOption {
  key: string;
  label: string;
  icon: string;
  color: string;
}

interface ConnectorSelectorProps {
  options: ConnectorOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function ConnectorSelector({ options, selected, onChange }: ConnectorSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (key: string) => {
    onChange(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-[6px] border border-border bg-card hover:bg-muted/50 transition-colors text-sm text-left"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">Select connectors...</span>
          ) : (
            selected.map((key) => {
              const opt = options.find((o) => o.key === key);
              return opt ? (
                <span key={key} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-[11px] font-medium text-foreground">
                  <img src={opt.icon} alt="" loading="lazy" className="w-3.5 h-3.5 rounded-full" />
                  {opt.label}
                </span>
              ) : null;
            })
          )}
        </div>
        <ChevronDown size={15} className="text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-[6px] border border-border bg-card shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((opt) => {
            const isSel = selected.includes(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggle(opt.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-sm text-left"
              >
                <img src={opt.icon} alt="" loading="lazy" className="w-5 h-5 rounded-full" />
                <span className="flex-1 text-foreground">{opt.label}</span>
                {isSel && <Check size={15} className="text-purple-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
