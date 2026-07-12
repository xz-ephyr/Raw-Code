import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { MODELS, getModelDefinition, SELECTED_MODEL_STORAGE_KEY, type ModelDefinition } from '@core/config/models';
import { getAllProviders, getProviderLabel } from '@core/providers';
import { ModelIcon } from '@/components/ui/ModelIcon';
import { Dropdown } from '@/components/ui/Dropdown';

interface ModelListProps {
  currentModel: string;
  showThinkingOnly?: boolean;
  isIdle?: boolean;
}

export default function ModelList({ currentModel, showThinkingOnly, isIdle }: ModelListProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (modelId: string) => {
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, modelId);
    window.dispatchEvent(new CustomEvent('model-changed'));
    setIsOpen(false);
  };

  const currentDef = getModelDefinition(currentModel);

  const filteredModels = showThinkingOnly
    ? MODELS.filter(m => m.supportsThinking)
    : MODELS;

  const providers = getAllProviders();
  const providerOrder = new Map(providers.map((p, i) => [p.id, i]));

  const grouped = new Map<string, ModelDefinition[]>();
  for (const m of filteredModels) {
    if (m.id.startsWith('auto/') || m.id === 'auto') continue;
    const key = m.provider;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
    const ai = providerOrder.get(a[0]) ?? 999;
    const bi = providerOrder.get(b[0]) ?? 999;
    return ai - bi;
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs"
        title="Select model"
      >
        <ModelIcon modelId={currentModel} size={14} />
        <span className="max-w-[100px] truncate">{currentDef?.label || currentModel}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position={isIdle ? 'bottom' : 'top'}
        align="right"
        width="260px"
        maxHeight="213px"
      >
        {sortedGroups.map(([providerId, models]) => {
          return (
            <div key={providerId}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {getProviderLabel(providerId)}
              </div>
              {models.map(m => {
                const isSelected = m.id === currentModel;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelect(m.id)}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2 rounded-md ${
                      isSelected
                        ? 'text-foreground bg-muted'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <ModelIcon modelId={m.id} size={14} />
                    <span className="flex-1 truncate">{m.label}</span>
                    {m.supportsThinking && (
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} className="text-blue-500 shrink-0" />
                    )}
                    {isSelected && (
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} className="text-green-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </Dropdown>
    </div>
  );
}