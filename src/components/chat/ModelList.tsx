import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, ArrowRight01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { MODELS, getModelDefinition, SELECTED_MODEL_STORAGE_KEY, type ModelDefinition } from '@core/config/models';
import { getProviderLabel } from '@core/providers';
import { ModelIcon } from '@/components/ui/ModelIcon';
import { Dropdown } from '@/components/ui/Dropdown';

interface ModelListProps {
  currentModel: string;
  showThinkingOnly?: boolean;
  isIdle?: boolean;
}

export default function ModelList({ currentModel, showThinkingOnly, isIdle }: ModelListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [subOpen, setSubOpen] = useState<string | null>(null);

  const handleSelect = (modelId: string) => {
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, modelId);
    window.dispatchEvent(new CustomEvent('model-changed'));
    setIsOpen(false);
    setSubOpen(null);
  };

  const currentDef = getModelDefinition(currentModel);

  const filteredModels = showThinkingOnly
    ? MODELS.filter(m => m.supportsThinking)
    : MODELS;

  const grouped = new Map<string, ModelDefinition[]>();
  for (const m of filteredModels) {
    if (m.id.startsWith('auto/') || m.id === 'auto') continue;
    const key = m.label;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  const modelEntries = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSubOpen(null);
        }}
        className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs"
        title="Select model"
      >
        <ModelIcon modelId={currentModel} size={14} />
        <span className="max-w-[100px] truncate">{currentDef?.label || currentModel}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); setSubOpen(null); }}
        position={isIdle ? 'bottom' : 'top'}
        align="right"
        width="260px"
        maxHeight="320px"
      >
        {modelEntries.map(([label, models]) => {
          const isSelected = !!models.find(m => m.id === currentModel);
          const hasMultipleProviders = models.length > 1;

          return (
            <div key={label} className="relative">
              <button
                type="button"
                onClick={() => {
                  if (hasMultipleProviders) {
                    setSubOpen(subOpen === label ? null : label);
                  } else {
                    handleSelect(models[0].id);
                  }
                }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2 rounded-md ${
                  isSelected ? 'text-foreground bg-muted' : 'text-foreground hover:bg-muted'
                }`}
              >
                <ModelIcon modelId={models[0].id} size={14} />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate">{label}</span>
                  {hasMultipleProviders ? (
                    <span className="text-[10px] text-muted-foreground">{models.length} providers</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">{getProviderLabel(models[0].provider)}</span>
                  )}
                </div>
                {hasMultipleProviders && (
                  <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="shrink-0 text-muted-foreground" />
                )}
                {models.some(m => m.supportsThinking) && (
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} className="text-blue-500 shrink-0" />
                )}
              </button>

              {hasMultipleProviders && subOpen === label && (
                <Dropdown
                  isOpen={true}
                  onClose={() => setSubOpen(null)}
                  position="left"
                  align="right"
                  width="180px"
                >
                  {models.map(m => {
                    const isThisSelected = m.id === currentModel;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelect(m.id)}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2.5 rounded-md ${
                          isThisSelected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <ModelIcon modelId={m.id} size={14} />
                        <span className="flex-1">{getProviderLabel(m.provider)}</span>
                        {isThisSelected && (
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} className="text-green-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </Dropdown>
              )}
            </div>
          );
        })}
      </Dropdown>
    </div>
  );
}
