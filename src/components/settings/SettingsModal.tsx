import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ViewIcon, ViewOffSlashIcon, Settings02Icon, Key01Icon, ZapIcon, GlobeIcon } from '@hugeicons/core-free-icons';
import {
  MODEL_MODE_STORAGE_KEY,
  MODEL_MODES,
  SELECTED_MODEL_STORAGE_KEY,
  getStoredModelMode,
  getStoredSelectedModel,
  API_KEYS,
  MODELS,
} from '../../config/models';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google Gemini',
  groq: 'Groq',
  mistral: 'Mistral AI',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  cerebras: 'Cerebras',
  opencodezen: 'OpenCode Zen',
  github: 'GitHub Models',
  cloudflare: 'Cloudflare',
  cohere: 'Cohere',
  zai: 'Z.ai (Zhipu)',
  nvidia: 'NVIDIA',
  huggingface: 'HuggingFace',
  ollama: 'Ollama Cloud',
  kilo: 'Kilo Gateway',
  pollinations: 'Pollinations',
  llm7: 'LLM7',
  ovh: 'OVH AI Endpoints',
  reka: 'Reka',
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [keys, setKeys] = useState(() => {
    const initialKeys: any = {};
    Object.keys(API_KEYS).forEach((key) => {
      initialKeys[key] = localStorage.getItem((API_KEYS as any)[key]) || '';
    });
    return initialKeys;
  });

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [selectedModel, setSelectedModel] = useState(getStoredSelectedModel);
  const [modelMode, setModelMode] = useState(getStoredModelMode);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'keys'>('general');

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    Object.keys(API_KEYS).forEach((key) => {
      localStorage.setItem((API_KEYS as any)[key], keys[key]);
    });

    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, selectedModel);
    localStorage.setItem(MODEL_MODE_STORAGE_KEY, modelMode);

    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[4px] z-50">
      <div className="bg-white rounded-[16px] w-[580px] shadow-2xl border border-neutral-100 flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <h2 className="text-[18px] font-bold text-neutral-800 flex items-center gap-2">
            <HugeiconsIcon icon={Settings02Icon} size={20} className="text-neutral-500" />
            Settings
          </h2>
          <div className="flex bg-neutral-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'general' ? 'bg-white shadow-sm text-black' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('keys')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'keys' ? 'bg-white shadow-sm text-black' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              API Keys
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {activeTab === 'general' ? (
            <div className="space-y-6">
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
                <p className="text-xs text-neutral-500">
                  Auto rotate cycles through every available model in the active chat session.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                  <HugeiconsIcon icon={GlobeIcon} size={16} />
                  Default Model
                </label>
                <select
                  className="h-10 bg-neutral-50 rounded-[10px] px-3 text-sm outline-none w-full border border-neutral-200 focus:border-black transition-all appearance-none cursor-pointer"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as typeof selectedModel)}
                >
                  {MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label} ({PROVIDER_LABELS[model.provider] || model.provider})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                <p className="text-xs text-blue-700 leading-relaxed">
                  Enter your API keys for the providers you wish to use. The system will use these keys for routing and fallbacks.
                </p>
              </div>

              {/* Vercel Gateway at top if used */}
              <div className="pb-4 border-b border-neutral-100">
                <label className="text-[13px] font-semibold text-neutral-700 ml-1">Vercel AI Gateway URL (Optional)</label>
                <input
                  type="text"
                  className="h-9 mt-1.5 bg-neutral-50 rounded-[8px] px-3 outline-none text-sm w-full border border-neutral-200 focus:border-neutral-400 transition-colors"
                  placeholder="https://gateway.ai.vercel.com/..."
                  value={keys.gateway}
                  onChange={(e) => setKeys({ ...keys, gateway: e.target.value })}
                />
              </div>

              {/* API Keys Grid - Scalable for many providers */}
              <div className="grid gap-x-6 gap-y-4 grid-cols-1 sm:grid-cols-2">
                {Object.keys(PROVIDER_LABELS).map((providerId) => (
                  <div key={providerId} className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-neutral-600 ml-1">{PROVIDER_LABELS[providerId]}</label>
                    <div className="relative">
                      <div className="absolute left-3 top-2.5 text-neutral-400">
                        <HugeiconsIcon icon={Key01Icon} size={13} />
                      </div>
                      <input
                        type={showKeys[providerId] ? 'text' : 'password'}
                        className="h-9 bg-neutral-50 rounded-[8px] pl-8 pr-9 outline-none text-sm w-full border border-neutral-200 focus:border-neutral-400 transition-colors"
                        placeholder={`Enter ${PROVIDER_LABELS[providerId]} Key`}
                        value={keys[providerId]}
                        onChange={(e) => setKeys({ ...keys, [providerId]: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey(providerId)}
                        className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600 p-0.5"
                      >
                        <HugeiconsIcon icon={showKeys[providerId] ? ViewOffSlashIcon : ViewIcon} size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-200/50 rounded-[10px] transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm font-bold text-white bg-black hover:bg-neutral-800 rounded-[10px] transition-all flex items-center gap-2 shadow-lg shadow-black/5 active:scale-[0.98]"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
