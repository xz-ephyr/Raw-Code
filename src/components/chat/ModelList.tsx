import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { MODELS, getModelDefinition, SELECTED_MODEL_STORAGE_KEY } from '@core/config/models';
import { ModelIcon } from '@/components/ui/ModelIcon';

interface ModelListProps {
  currentModel: string;
  showThinkingOnly?: boolean;
  isIdle?: boolean;
}

export default function ModelList({ currentModel, showThinkingOnly, isIdle }: ModelListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (modelId: string) => {
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, modelId);
    window.dispatchEvent(new CustomEvent('model-changed'));
    setIsOpen(false);
  };

  const currentDef = getModelDefinition(currentModel);

  const filteredModels = showThinkingOnly
    ? MODELS.filter(m => m.supportsThinking)
    : MODELS;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs"
        title="Select model"
      >
        <span className="max-w-[100px] truncate">{currentDef?.label || currentModel}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
      </button>
      {isOpen && (
        <div className={`absolute ${isIdle ? 'top-full mt-1' : 'bottom-full mb-1'} right-0 w-[229px] bg-card border border-border rounded-xl shadow-xl shadow-black/30 z-[9999] overflow-hidden`}>
          <div className="overflow-y-auto thin-scrollbar" style={{ maxHeight: '190px' }}>
            {filteredModels.map((model, idx) => (
              <button
                key={`${model.id}-${idx}`}
                type="button"
                onClick={() => handleSelect(model.id)}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2 rounded-md ${
                   model.id === currentModel
                     ? 'text-foreground bg-muted'
                     : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <ModelIcon modelId={model.id} size={14} />
                <span className="truncate">{model.label}</span>
                {model.supportsThinking && (
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-blue-500 shrink-0 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
