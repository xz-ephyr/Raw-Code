import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ViewIcon, ViewOffSlashIcon, Key01Icon } from '@hugeicons/core-free-icons';
import {
  SELECTED_MODEL_STORAGE_KEY,
  getStoredSelectedModel,
} from '@core/config/models';
import { saveProviderKeys, useProviderKeys } from '@/hooks/useProviderKeys';
import { DefaultModelSelector } from '@/components/ui/DefaultModelSelector';

interface ModelSetupStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ModelSetupStep({ onComplete, onSkip }: ModelSetupStepProps) {
  const { providers, keys, setKeys } = useProviderKeys();

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [selectedModel, setSelectedModel] = useState(getStoredSelectedModel);

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSave = async () => {
    await saveProviderKeys(providers, keys);
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, selectedModel);
    window.dispatchEvent(new CustomEvent('model-changed'));
    onComplete();
  };

  const hasAnyKey = providers.some(
    (p) => keys[p.id]?.trim().length > 0
  );

  return (
    <div className="flex flex-col max-w-lg mx-auto gap-6 py-4 w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Configure AI Model</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Set up your AI provider to start coding with AI assistance.
        </p>
      </div>

      <div className="bg-blue-900/20 p-3 rounded-[8px] border border-blue-800">
        <p className="text-xs text-blue-400 leading-relaxed">
          Enter your API keys for the providers you wish to use. Keys are stored locally and never sent anywhere
          except to the provider directly.
        </p>
      </div>

      <div className="space-y-4">
        {providers.map((p) => (
          <div key={p.id} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground ml-1">
              {p.label}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-2.5 text-muted-foreground">
                <HugeiconsIcon icon={Key01Icon} size={14} />
              </div>
              <input
                type={showKeys[p.id] ? 'text' : 'password'}
                className="h-10 bg-muted rounded-[10px] pl-9 pr-10 outline-none text-sm w-full border border-border focus:border-muted-foreground transition-colors"
                placeholder={`Enter ${p.label} API Key`}
                value={keys[p.id]}
                onChange={(e) => setKeys({ ...keys, [p.id]: e.target.value })}
              />
              <button
                type="button"
                onClick={() => toggleShowKey(p.id)}
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-muted-foreground"
              >
                <HugeiconsIcon
                  icon={showKeys[p.id] ? ViewOffSlashIcon : ViewIcon}
                  size={16}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 pt-2 border-t border-border">
        <DefaultModelSelector selectedModel={selectedModel} onChange={setSelectedModel} maxHeight="190px" />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onSkip}
          className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground font-medium text-sm hover:bg-muted transition-all"
        >
          Skip for now
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/80 transition-all active:scale-[0.98]"
        >
          {hasAnyKey ? 'Save & Continue' : 'Continue without API key'}
        </button>
      </div>
    </div>
  );
}
