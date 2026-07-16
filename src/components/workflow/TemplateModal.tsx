import { useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import type { TemplateMeta } from '@/data/workflowTemplates';

const CONNECTOR_SVGS: Record<string, string> = {
  Gmail: '/gmail.svg',
  GitHub: '/github.svg',
  Slack: '/slack.svg',
  Telegram: '/telegram.svg',
  Reddit: '/reddit.svg',
  Twitter: '/twitter.svg',
  YouTube: '/youtube.svg',
};

interface TemplateModalProps {
  template: TemplateMeta;
  onClose: () => void;
  onUse: (tpl: TemplateMeta) => void;
}

export function TemplateModal({ template, onClose, onUse }: TemplateModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto thin-scrollbar shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5">
              {template.connectors.length > 0 ? (
                template.connectors.map((c) => {
                  const src = CONNECTOR_SVGS[c];
                  return src ? (
                    <img key={c} src={src} alt={c} loading="lazy" className="w-7 h-7 rounded-full bg-card ring-2 ring-border" />
                  ) : (
                    <div key={c} className="w-7 h-7 rounded-full bg-muted ring-2 ring-border flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                      {c[0]}
                    </div>
                  );
                })
              ) : (
                <div className="w-7 h-7 rounded-full bg-muted ring-2 ring-border flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">*</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{template.title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-2">
          <p className="text-sm text-muted-foreground leading-relaxed">{template.longDescription}</p>
        </div>

        <div className="px-6 pb-2">
          <h4 className="text-xs font-medium text-foreground uppercase tracking-wider mb-2">Steps</h4>
          <div className="space-y-1.5">
            {template.steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/30">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground shrink-0">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <span className="text-sm text-foreground">{step.label}</span>
                  <p className="text-[11px] text-muted-foreground/60">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 pt-4">
          <button
            onClick={() => onUse(template)}
            className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
            aria-label="use template"
          >
            <Plus size={15} />
            Use Template
          </button>
        </div>
      </div>
    </div>
  );
}
