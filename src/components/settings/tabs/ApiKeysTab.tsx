import { useState } from 'react';
import {
  SELECTED_MODEL_STORAGE_KEY,
  getStoredSelectedModel,
} from '@core/config/models';
import { refreshProviders } from '@core/models/aiService';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { DefaultModelSelector } from '@/components/ui/DefaultModelSelector';
import { useProviderKeys } from '@/hooks/useProviderKeys';

export function ApiKeysTab() {
  const { providers, keys, setKeys, saveAll } = useProviderKeys();

  const [selectedModel, setSelectedModel] = useState(getStoredSelectedModel);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveApiKeys = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    await saveAll();
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, selectedModel);
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
        {providers.map((p) => (
          <div key={p.id} className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-muted-foreground ml-1">{p.label}</label>
            <PasswordInput
              value={keys[p.id]}
              onChange={(value) => setKeys({ ...keys, [p.id]: value })}
              placeholder={`Enter ${p.label} Key`}
              showKeyIcon
            />
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-5 space-y-5">
        <DefaultModelSelector selectedModel={selectedModel} onChange={setSelectedModel as (id: string) => void} maxHeight="155px" />
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
