import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { WORKFLOW_TEMPLATES } from '@/data/workflowTemplates';
import { TemplateModal } from './TemplateModal';
import { HugeiconRenderer } from '@/components/ui/HugeiconRenderer';
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

interface TemplateCardProps {
  template: TemplateMeta;
  onUse: (tpl: TemplateMeta) => void;
  onClick: (tpl: TemplateMeta) => void;
}

function TemplateCard({ template, onUse, onClick }: TemplateCardProps) {
  const shortTitle = template.title.split(' ').slice(0, 3).join(' ');

  return (
    <div
      onClick={() => onClick(template)}
      className="group relative flex flex-col border border-black/10 dark:border-white/10 rounded-xl bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors cursor-pointer min-h-[100px]"
    >
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex -space-x-1.5">
              {template.connectors.length > 0 ? (
                template.connectors.map((c) => {
                  const src = CONNECTOR_SVGS[c];
                  return src ? (
                    <img key={c} src={src} alt={c} loading="lazy" className="w-5 h-5 rounded-full bg-card ring-1 ring-border" />
                  ) : (
                    <div key={c} className="w-5 h-5 rounded-full bg-muted ring-1 ring-border flex items-center justify-center text-[8px] text-muted-foreground font-medium">
                      {c[0]}
                    </div>
                  );
                })
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted ring-1 ring-border flex items-center justify-center">
                  <HugeiconRenderer icon={Add01Icon} size={10} className="text-muted-foreground" />
                </div>
              )}
            </div>
            <span className="text-sm font-semibold text-foreground truncate">{shortTitle}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onUse(template); }}
            className="flex items-center justify-center w-6 h-6 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity shrink-0"
            aria-label="use template"
          >
            <Plus size={13} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2 leading-relaxed">
          {template.description}
        </p>
      </div>
    </div>
  );
}

export function TemplateSection() {
  const navigate = useNavigate();
  const [modalTemplate, setModalTemplate] = useState<TemplateMeta | null>(null);

  const handleUse = (_tpl: TemplateMeta) => {
    navigate('/workflow/create');
  };

  return (
    <section>
      <div className="mb-1 border-t border-border" />
      <div className="flex items-center justify-between mb-4 mt-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Templates (beta)</h2>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
        {WORKFLOW_TEMPLATES.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            onUse={handleUse}
            onClick={(t) => setModalTemplate(t)}
          />
        ))}
      </div>

      {modalTemplate && (
        <TemplateModal
          template={modalTemplate}
          onClose={() => setModalTemplate(null)}
          onUse={handleUse}
        />
      )}
    </section>
  );
}
