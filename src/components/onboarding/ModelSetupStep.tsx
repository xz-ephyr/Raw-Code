import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ViewIcon, ViewOffSlashIcon, Key01Icon, ZapIcon, GlobeIcon, CheckmarkCircle01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import {
  MODEL_MODE_STORAGE_KEY,
  MODEL_MODES,
  SELECTED_MODEL_STORAGE_KEY,
  getStoredModelMode,
  getStoredSelectedModel,
  API_KEYS,
  MODELS,
} from '@core/config/models';

interface ModelSetupStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google Gemini',
  groq: 'Groq',
  opencodezen: 'OpenCode Zen',
  mistral: 'Mistral',
  openrouter: 'OpenRouter',
  cerebras: 'Cerebras',
};

export function ModelSetupStep({ onComplete, onSkip }: ModelSetupStepProps) {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isModelDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModelDropdownOpen]);

  const [keys, setKeys] = useState(() => {
    const initial: any = {};
    Object.keys(API_KEYS).forEach((key) => {
      initial[key] = localStorage.getItem((API_KEYS as any)[key]) || '';
    });
    return initial;
  });

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [selectedModel, setSelectedModel] = useState(getStoredSelectedModel);
  const [modelMode, setModelMode] = useState(getStoredModelMode);

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSave = () => {
    Object.keys(API_KEYS).forEach((key) => {
      localStorage.setItem((API_KEYS as any)[key], keys[key]);
    });
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, selectedModel);
    localStorage.setItem(MODEL_MODE_STORAGE_KEY, modelMode);
    window.dispatchEvent(new CustomEvent('model-changed'));
    onComplete();
  };

  const hasAnyKey = Object.keys(PROVIDER_LABELS).some(
    (p) => keys[p]?.trim().length > 0
  );

  return (
    <div className="flex flex-col max-w-lg mx-auto gap-6 py-4 w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-neutral-900">Configure AI Model</h2>
        <p className="text-neutral-500 text-sm mt-1">
          Set up your AI provider to start coding with AI assistance.
        </p>
      </div>

      <div className="bg-blue-50 p-3 rounded-[8px] border border-blue-100">
        <p className="text-xs text-blue-700 leading-relaxed">
          Enter your API keys for the providers you wish to use. Keys are stored locally and never sent anywhere
          except to the provider directly.
        </p>
      </div>

      <div className="space-y-4">
        {Object.keys(PROVIDER_LABELS).map((providerId) => (
          <div key={providerId} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 ml-1">
              {PROVIDER_LABELS[providerId]}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-2.5 text-neutral-400">
                <HugeiconsIcon icon={Key01Icon} size={14} />
              </div>
              <input
                type={showKeys[providerId] ? 'text' : 'password'}
                className="h-10 bg-neutral-50 rounded-[10px] pl-9 pr-10 outline-none text-sm w-full border border-neutral-200 focus:border-neutral-400 transition-colors"
                placeholder={`Enter ${PROVIDER_LABELS[providerId]} API Key`}
                value={keys[providerId]}
                onChange={(e) => setKeys({ ...keys, [providerId]: e.target.value })}
              />
              <button
                type="button"
                onClick={() => toggleShowKey(providerId)}
                className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600"
              >
                <HugeiconsIcon
                  icon={showKeys[providerId] ? ViewOffSlashIcon : ViewIcon}
                  size={16}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 pt-2 border-t border-neutral-100">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <HugeiconsIcon icon={ZapIcon} size={16} />
            Model Mode
          </label>
          <select
            className="h-10 bg-neutral-50 rounded-[10px] px-3 text-sm outline-none w-full border border-neutral-200 focus:border-black transition-all appearance-none cursor-pointer"
            value={modelMode}
            onChange={(e) => setModelMode(e.target.value as typeof modelMode)}
          >
            <option value={MODEL_MODES.fixed}>Fixed selected model</option>
            <option value={MODEL_MODES.rotate}>Auto rotate models</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <HugeiconsIcon icon={GlobeIcon} size={16} />
            Default Model
          </label>
          <div className="relative" ref={modelDropdownRef}>
            <div
              className="h-10 bg-neutral-50 rounded-[10px] px-3 text-sm outline-none w-full border border-neutral-200 flex items-center cursor-pointer"
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            >
              <span className="flex-1 truncate">
                {(() => {
                  const def = MODELS.find(m => m.id === selectedModel);
                  return def ? `${def.label} (${PROVIDER_LABELS[def.provider] || def.provider})` : selectedModel;
                })()}
              </span>
              <HugeiconsIcon icon={ArrowDown01Icon} size={16} className="text-neutral-400 shrink-0" />
            </div>
            {isModelDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 rounded-[10px] shadow-lg overflow-hidden">
                <div className="overflow-y-auto thin-scrollbar" style={{ maxHeight: 190 }}>
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-neutral-50 transition-colors flex items-center gap-2 ${
                        selectedModel === model.id ? 'bg-neutral-100 font-medium' : ''
                      }`}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setIsModelDropdownOpen(false);
                      }}
                    >
                      <span className="flex-1 truncate">{model.label}</span>
                      <span className="text-[11px] text-neutral-400 shrink-0">{PROVIDER_LABELS[model.provider] || model.provider}</span>
                      {model.supportsThinking && (
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-blue-500 shrink-0 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onSkip}
          className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 font-medium text-sm hover:bg-neutral-50 transition-all"
        >
          Skip for now
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-xl bg-black text-white font-medium text-sm hover:bg-neutral-800 transition-all active:scale-[0.98]"
        >
          {hasAnyKey ? 'Save & Continue' : 'Continue without API key'}
        </button>
      </div>
    </div>
  );
}
