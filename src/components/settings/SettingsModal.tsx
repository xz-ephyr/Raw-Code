import { useState } from 'react';

const AI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('api-key') || '');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('selected-model') || AI_MODELS[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate a brief delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 600));
    localStorage.setItem('api-key', apiKey);
    localStorage.setItem('selected-model', selectedModel);
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[4px] z-50">
      <div className="bg-white rounded-[12px] p-6 w-[500px] shadow-xl border border-neutral-100">
        <h2 className="text-[18px] font-bold mb-6">Settings</h2>
        
        <div className="space-y-6">
          {/* API Key Section */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-neutral-700">Google API Key</label>
            <input
              type="password"
              className="h-9 bg-neutral-50 rounded-[8px] px-3 outline-none text-sm w-full border border-neutral-200 focus:border-neutral-400 transition-colors"
              placeholder="Enter your API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          {/* Model Selection Section */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-neutral-700">Select Model</label>
            <select 
              className="h-9 bg-neutral-50 rounded-[8px] px-3 text-sm outline-none w-full border border-neutral-200 focus:border-neutral-400 transition-colors"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {AI_MODELS.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-8">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-100 rounded-[8px] transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="px-4 py-2 text-sm font-bold text-white bg-black hover:bg-neutral-800 rounded-[8px] transition-colors flex items-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
