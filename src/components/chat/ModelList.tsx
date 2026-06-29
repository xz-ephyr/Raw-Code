import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { MODELS, getModelDefinition, SELECTED_MODEL_STORAGE_KEY } from '../../config/models';

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  groq: 'Groq',
  opencodezen: 'OpenCode Zen',
  mistral: 'Mistral',
  openrouter: 'OpenRouter',
  cerebras: 'Cerebras',
};

const PROVIDER_ORDER = ['google', 'groq', 'opencodezen', 'mistral', 'openrouter', 'cerebras'];

interface ModelListProps {
  currentModel: string;
}

export default function ModelList({ currentModel }: ModelListProps) {
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

  const groups = PROVIDER_ORDER
    .map(provider => ({
      provider,
      label: PROVIDER_LABELS[provider] || provider,
      models: MODELS.filter(m => m.provider === provider),
    }))
    .filter(g => g.models.length > 0);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-700 transition-colors text-xs"
        title="Select model"
      >
        <span className="max-w-[100px] truncate">{currentDef?.label || currentModel}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
      </button>
      {isOpen && (
        <div className="absolute bottom-full mb-1 right-0 w-[229px] bg-white border border-neutral-200 rounded-xl shadow-xl z-[9999] overflow-hidden">
          <div className="overflow-y-auto thin-scrollbar" style={{ maxHeight: '190px' }}>
            {groups.map(group => (
              <div key={group.provider}>
                <div className="px-3 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  {group.label}
                </div>
                {group.models.map(model => (
                    <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelect(model.id)}
                    className={`w-full text-left px-3 py-1 text-xs transition-colors flex items-center gap-2 rounded-md ${
                      model.id === currentModel
                        ? 'text-neutral-900 bg-neutral-100'
                        : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="truncate">{model.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
