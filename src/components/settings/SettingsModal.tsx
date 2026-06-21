import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ViewIcon, ViewOffSlashIcon, Settings02Icon, Key01Icon, ZapIcon, Cancel01Icon,
  FolderLibraryIcon, GlobeIcon,
} from '@hugeicons/core-free-icons';
import {
  MODEL_MODE_STORAGE_KEY,
  MODEL_MODES,
  SELECTED_MODEL_STORAGE_KEY,
  getStoredModelMode,
  getStoredSelectedModel,
  getModelDefinition,
  API_KEYS,
  MODELS,
} from '../../config/models';
import { refreshProviders } from '../../services/aiService';
import { useToast } from '../ui/Toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google Gemini',
  groq: 'Groq',
  opencodezen: 'OpenCode Zen',
  mistral: 'Mistral',
  openrouter: 'OpenRouter',
  cerebras: 'Cerebras',
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
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const { confirmAsync } = useToast();

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSaveApiKeys = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    Object.keys(API_KEYS).forEach((key) => {
      localStorage.setItem((API_KEYS as any)[key], keys[key]);
    });
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, selectedModel);
    localStorage.setItem(MODEL_MODE_STORAGE_KEY, modelMode);
    refreshProviders();
    window.dispatchEvent(new CustomEvent('model-changed'));
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[4px] z-50">
      <div className="bg-white rounded-[16px] w-[min(1100px,95vw)] h-[85vh] min-h-[500px] shadow-2xl border border-neutral-100 flex flex-col overflow-hidden">
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
          <nav className="w-64 border-r border-neutral-100 p-3 space-y-1 shrink-0 overflow-y-auto">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-2.5 rounded-[8px] cursor-pointer active:scale-[0.99] transition-transform w-full gap-3 ${
                    isActive ? 'bg-[#e5e5e5]' : 'hover:bg-[#f2f3f6]'
                  }`}
                >
                  <div className="shrink-0 flex items-center justify-center w-[18px] h-[18px]">
                    <HugeiconsIcon icon={tab.icon} size={18} color="currentColor" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right content */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-neutral-700">Default Page</label>
                  <select
                    className="h-10 bg-neutral-50 rounded-[10px] px-3 text-sm outline-none w-full border border-neutral-200 focus:border-black transition-all appearance-none cursor-pointer"
                    defaultValue={localStorage.getItem('default_page') || 'chats'}
                    onChange={(e) => localStorage.setItem('default_page', e.target.value)}
                  >
                    <option value="chats">Chats list</option>
                    <option value="thread">New thread</option>
                    <option value="last">Last open session</option>
                  </select>
                  <p className="text-xs text-neutral-500">Which page to show on launch.</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-neutral-700">Message Timestamps</label>
                    <p className="text-xs text-neutral-500 mt-0.5">Show time stamps below chat messages.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      defaultChecked={localStorage.getItem('show_timestamps') !== 'false'}
                      onChange={(e) => localStorage.setItem('show_timestamps', String(e.target.checked))}
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black" />
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-neutral-700">Auto-save Drafts</label>
                    <p className="text-xs text-neutral-500 mt-0.5">Automatically save unsent messages as drafts.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      defaultChecked={localStorage.getItem('auto_drafts') !== 'false'}
                      onChange={(e) => localStorage.setItem('auto_drafts', String(e.target.checked))}
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black" />
                  </label>
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

                <div className="border-t border-neutral-100 pt-5 space-y-5">
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
                    <div className="relative">
                      <div
                        className="h-10 bg-neutral-50 rounded-[10px] px-3 text-sm outline-none w-full border border-neutral-200 flex items-center cursor-pointer"
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                      >
                        <span className="flex-1 truncate">
                          {getModelDefinition(selectedModel)
                            ? `${getModelDefinition(selectedModel)!.label} (${PROVIDER_LABELS[getModelDefinition(selectedModel)!.provider] || getModelDefinition(selectedModel)!.provider})`
                            : selectedModel}
                        </span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400 shrink-0">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                      {isModelDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 rounded-[10px] shadow-lg overflow-hidden">
                          <div className="overflow-y-auto" style={{ maxHeight: 155 }}>
                            {MODELS.map((model) => (
                              <button
                                key={model.id}
                                className={`w-full px-3 py-2 text-sm text-left hover:bg-neutral-50 transition-colors flex items-center gap-2 ${
                                  selectedModel === model.id ? 'bg-neutral-100 font-medium' : ''
                                }`}
                                onClick={() => {
                                  setSelectedModel(model.id as typeof selectedModel);
                                  setIsModelDropdownOpen(false);
                                }}
                              >
                                <span className="flex-1 truncate">{model.label}</span>
                                <span className="text-[11px] text-neutral-400 shrink-0">{PROVIDER_LABELS[model.provider] || model.provider}</span>
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
                    onClick={async () => {
                      if (await confirmAsync('Clear all chat history? This cannot be undone.')) {
                        if (await confirmAsync('Are you sure? All messages and sessions will be permanently deleted.')) {
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
                    onClick={async () => {
                      if (await confirmAsync('Reset onboarding tour? You will see the welcome screens again on next launch.')) {
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
