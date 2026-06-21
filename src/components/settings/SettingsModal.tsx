import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ViewIcon, ViewOffSlashIcon, Settings02Icon, Key01Icon, ZapIcon, Cancel01Icon,
  FolderLibraryIcon, GlobeIcon,
} from '@hugeicons/core-free-icons';
import { useZoomContext } from '../layout/ZoomProvider';
import {
  MODEL_MODE_STORAGE_KEY,
  MODEL_MODES,
  SELECTED_MODEL_STORAGE_KEY,
  getStoredModelMode,
  getStoredSelectedModel,
  API_KEYS,
  MODELS,
} from '../../config/models';
import { refreshProviders } from '../../services/aiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google Gemini',
  groq: 'Groq',
};

const SIDEBAR_STORAGE_KEY = 'sidebar_collapsed';

const tabs = [
  { id: 'general', label: 'General', icon: Settings02Icon },
  { id: 'api-keys', label: 'API Keys', icon: Key01Icon },
  { id: 'appearance', label: 'Appearance', icon: ViewIcon },
  { id: 'behavior', label: 'Behavior', icon: ZapIcon },
  { id: 'storage', label: 'Storage', icon: FolderLibraryIcon },
] as const;

type TabId = (typeof tabs)[number]['id'];

function ZoomSlider() {
  const { zoom, zoomIn, zoomOut, resetZoom, setZoomLevel } = useZoomContext();
  const presets = [0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-neutral-700">Zoom</label>
        <button
          onClick={resetZoom}
          className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors underline underline-offset-2"
        >
          Reset to 100%
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={zoomOut}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-700 text-lg font-medium"
        >
          −
        </button>
        <div className="flex-1 flex items-center gap-1">
          {presets.map((level) => (
            <button
              key={level}
              onClick={() => setZoomLevel(level)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                zoom === level
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {Math.round(level * 100)}%
            </button>
          ))}
        </div>
        <button
          onClick={zoomIn}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-700 text-lg font-medium"
        >
          +
        </button>
      </div>
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [isSaving, setIsSaving] = useState(false);

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSaveApiKeys = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    Object.keys(API_KEYS).forEach((key) => {
      localStorage.setItem((API_KEYS as any)[key], keys[key]);
    });
    refreshProviders();
    setIsSaving(false);
  };

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, selectedModel);
    localStorage.setItem(MODEL_MODE_STORAGE_KEY, modelMode);
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[4px] z-50">
      <div className="bg-white rounded-[16px] w-[min(820px,90vw)] shadow-2xl border border-neutral-100 flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <h2 className="text-[18px] font-bold text-neutral-800 flex items-center gap-2">
            <HugeiconsIcon icon={Settings02Icon} size={20} className="text-neutral-500" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* Two-pane body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left nav */}
          <nav className="w-44 border-r border-neutral-100 p-2 space-y-0.5 shrink-0 overflow-y-auto">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-neutral-100 text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <HugeiconsIcon icon={tab.icon} size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right content */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            {activeTab === 'general' && (
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

                <div className="border-t border-neutral-100 pt-6">
                  <ZoomSlider />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveGeneral}
                    disabled={isSaving}
                    className="px-6 py-2 text-sm font-bold text-white bg-black hover:bg-neutral-800 rounded-[10px] transition-all flex items-center gap-2 shadow-lg shadow-black/5 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : null}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'api-keys' && (
              <div className="space-y-5">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Enter your API keys for the providers you wish to use. The system will use these keys for routing and fallbacks.
                  </p>
                </div>

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

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveApiKeys}
                    disabled={isSaving}
                    className="px-6 py-2 text-sm font-bold text-white bg-black hover:bg-neutral-800 rounded-[10px] transition-all flex items-center gap-2 shadow-lg shadow-black/5 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : null}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-neutral-700">Sidebar on Startup</label>
                  <select
                    className="h-10 bg-neutral-50 rounded-[10px] px-3 text-sm outline-none w-full border border-neutral-200 focus:border-black transition-all appearance-none cursor-pointer"
                    defaultValue={localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true' ? 'collapsed' : 'expanded'}
                    onChange={(e) => {
                      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(e.target.value === 'collapsed'));
                    }}
                  >
                    <option value="expanded">Expanded</option>
                    <option value="collapsed">Collapsed</option>
                  </select>
                  <p className="text-xs text-neutral-500">
                    Changes apply immediately on next load.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'behavior' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-neutral-700">Enable Thinking by Default</label>
                    <p className="text-xs text-neutral-500 mt-0.5">Show reasoning traces on supported models.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      defaultChecked={localStorage.getItem('thinking_default') === 'true'}
                      onChange={(e) => {
                        localStorage.setItem('thinking_default', String(e.target.checked));
                      }}
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black" />
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-neutral-700">Auto-create Artifacts</label>
                    <p className="text-xs text-neutral-500 mt-0.5">Automatically preview UI code as artifacts.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      defaultChecked={localStorage.getItem('auto_artifacts') !== 'false'}
                      onChange={(e) => {
                        localStorage.setItem('auto_artifacts', String(e.target.checked));
                      }}
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black" />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'storage' && (
              <div className="space-y-6">
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <h4 className="text-sm font-semibold text-neutral-700 mb-2">Local Database</h4>
                  <p className="text-xs text-neutral-500">
                    Your projects, chats, and messages are stored locally in SQLite. This data never leaves your machine.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      // Export all data as JSON
                      const data: Record<string, string> = {};
                      for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key) data[key] = localStorage.getItem(key) || '';
                      }
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'xz-backup.json';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-[10px] transition-colors text-left"
                  >
                    Export All Data
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Clear all chat history? This cannot be undone.')) {
                        if (window.confirm('Are you sure? All messages and sessions will be permanently deleted.')) {
                          // Clear only chat-related localStorage keys
                          const keysToRemove = ['chat_sessions', 'project_chat_sessions', 'projects'];
                          keysToRemove.forEach(k => localStorage.removeItem(k));
                        }
                      }
                    }}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-[10px] transition-colors text-left"
                  >
                    Clear Chat History
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Reset onboarding tour? You will see the welcome screens again on next launch.')) {
                        localStorage.removeItem('onboarding_completed');
                      }
                    }}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-[10px] transition-colors text-left"
                  >
                    Reset Onboarding
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
