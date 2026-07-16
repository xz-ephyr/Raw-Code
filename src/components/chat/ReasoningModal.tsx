import { useEffect, useRef } from 'react';
import { X, Footprints } from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';

interface ReasoningModalProps {
  reasoning: string;
  onClose: () => void;
}

export function ReasoningModal({ reasoning, onClose }: ReasoningModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl w-full max-w-[500px] max-h-[70vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Footprints size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Reasoning</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto thin-scrollbar p-4 text-sm leading-relaxed">
          <MarkdownMessage content={reasoning} sources={[]} />
        </div>
      </div>
    </div>
  );
}
