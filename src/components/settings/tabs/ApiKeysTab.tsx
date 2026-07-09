import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ZapIcon, GlobeIcon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import {
  MODEL_MODE_STORAGE_KEY,
  MODEL_MODES,
  SELECTED_MODEL_STORAGE_KEY,
  getStoredModelMode,
  getStoredSelectedModel,
  API_KEYS,
  MODELS,
} from '@core/config/models';
import { refreshProviders } from '@core/models/aiService';
import { DatabaseService } from '@core/utils/DatabaseService';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ModelIcon } from '@/components/ui/ModelIcon';

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google Gemini',
  groq: 'Groq',
  opencodezen: 'OpenCode Zen',
  mistral: 'Mistral',
  openrouter: 'OpenRouter',
  cerebras: 'Cerebras',
};

export function ApiKeysTab() {
  const [keys, setKeys] = useState<Record<string, string>>(
    Object.fromEntries(Object.keys(API_KEYS).map(k => [k, '']))
  );

  useEffect(() => {
    (async () => {
      const initial: any = {};
      for (const key of Object.keys(API_KEYS)) {
        const storageKey = (API_KEYS as any)[key];
        initial[key] = await DatabaseService.getConfig(storageKey)
          .then(r => r || localStorage.getItem(storageKey) || '');
      }
      setKeys(initial);
    })();
  }, []);

  const [selectedModel, setSelectedModel] = useState(getStoredSelectedModel);
  const [modelMode, setModelMode] = useState(getStoredModelMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const handleSaveApiKeys = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    await Promise.all(Object.keys(API_KEYS).map((key) =>
      DatabaseService.setConfig((API_KEYS as any)[key], keys[key])
    ));
    Object.keys(API_KEYS).forEach((key) => {
      localStorage.setItem((API_KEYS as any)[key], keys[key]);
    });
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, selectedModel);
    localStorage.setItem(MODEL_MODE_STORAGE_KEY, modelMode);
    refreshProviders();
    window.dispatchEvent(new CustomEvent('model-changed'));
    setIsSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-800">
        <p className="text-xs text-blue-400 leading-relaxed">
          Enter your API keys for the providers you wish to use. The system will use these keys for routing and fallbacks.
        </p>
      </div>

      <div className="grid gap-x-6 gap-y-4 grid-cols-1 sm:grid-cols-2">
        {Object.keys(PROVIDER_LABELS).map((providerId) => (
          <div key={providerId} className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-muted-foreground ml-1">{PROVIDER_LABELS[providerId]}</label>
            <PasswordInput
              value={keys[providerId]}
              onChange={(value) => setKeys({ ...keys, [providerId]: value })}
              placeholder={`Enter ${PROVIDER_LABELS[providerId]} Key`}
              showKeyIcon
            />
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-5 space-y-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <HugeiconsIcon icon={ZapIcon} size={16} />
            Model Mode
          </label>
          <select
            className="h-10 bg-muted rounded-[10px] px-3 text-sm outline-none w-full border border-border focus:border-ring transition-all appearance-none cursor-pointer"
            value={modelMode}
            onChange={(e) => setModelMode(e.target.value as typeof modelMode)}
          >
            <option value={MODEL_MODES.fixed}>Fixed selected model</option>
            <option value={MODEL_MODES.rotate}>Auto rotate models</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Auto rotate cycles through every available model in the active chat session.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <HugeiconsIcon icon={GlobeIcon} size={16} />
            Default Model
          </label>
          <div className="relative">
            <div
              className="h-10 bg-muted rounded-[10px] px-3 text-sm outline-none w-full border border-border flex items-center cursor-pointer"
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            >
              <span className="flex-1 truncate">
                {(() => {
                  const def = MODELS.find(m => m.id === selectedModel);
                  return def ? `${def.label} (${PROVIDER_LABELS[def.provider] || def.provider})` : selectedModel;
                })()}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            {isModelDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-[10px] shadow-lg shadow-black/30 overflow-hidden">
                <div className="overflow-y-auto thin-scrollbar" style={{ maxHeight: 155 }}>
                  {MODELS.map((model, idx) => (
                    <button
                      key={`${model.id}-${idx}`}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2 ${
                        selectedModel === model.id ? 'bg-muted font-medium' : ''
                      }`}
                      onClick={() => {
                        setSelectedModel(model.id as typeof selectedModel);
                        setIsModelDropdownOpen(false);
                      }}
                    >
                      <ModelIcon modelId={model.id} size={14} />
                      <span className="flex-1 truncate">{model.label}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{PROVIDER_LABELS[model.provider] || model.provider}</span>
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

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSaveApiKeys}
          disabled={isSaving}
          className="px-6 py-2 text-sm font-bold text-accent-foreground bg-accent hover:bg-muted rounded-[10px] transition-all flex items-center gap-2 shadow-lg shadow-black/30 active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : null}
          Save Changes
        </button>
      </div>
    </div>
  );
}
