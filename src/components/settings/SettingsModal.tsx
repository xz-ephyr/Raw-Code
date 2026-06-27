import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ViewIcon, ViewOffSlashIcon, Settings02Icon, Key01Icon, ZapIcon, Cancel01Icon,
  FolderLibraryIcon, GlobeIcon, AiSearch02Icon,
} from '@hugeicons/core-free-icons';
import { DatabaseService } from '../../services/DatabaseService';
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
import { useZoomContext } from '../layout/ZoomProvider';

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
  { id: 'web-search', label: 'Web & Search', icon: AiSearch02Icon },
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
  const [searchConfig, setSearchConfig] = useState<Record<string, string>>({});
  const [searchKeysLoaded, setSearchKeysLoaded] = useState(false);
  const [showSearchKeys, setShowSearchKeys] = useState<Record<string, boolean>>({});
  const { confirmAsync } = useToast();

  useEffect(() => {
    if (activeTab !== 'web-search') return;
    if (searchKeysLoaded) return;
    const keys = ['search-provider', 'search-api-key', 'search-exa-api-key', 'search-firecrawl-api-key', 'search-google-api-key', 'search-google-cx'];
    Promise.all(keys.map(k => DatabaseService.getConfig(k).then(v => ({ key: k, value: v || '' }))))
      .then((entries) => {
        const map: Record<string, string> = {};
        entries.forEach(e => { map[e.key] = e.value; });
        setSearchConfig(map);
        setSearchKeysLoaded(true);
      })
      .catch(() => setSearchKeysLoaded(true));
  }, [activeTab, searchKeysLoaded]);

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
      <div className="bg-background rounded-[16px] w-[min(1100px,95vw)] h-[85vh] min-h-[500px] shadow-2xl border border-neutral-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <h2 className="text-[18px] font-bold text-card-foreground flex items-center gap-2">
            <HugeiconsIcon icon={Settings02Icon} size={20} className="text-neutral-500" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-foreground hover:bg-neutral-100 transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* Two-pane body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left nav */}
          <nav className="w-64 border-r border-neutral-100 p-3 space-y-1 shrink-0 overflow-y-auto thin-scrollbar">
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
          <div className="flex-1 p-6 overflow-y-auto thin-scrollbar">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">Default Page</label>
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
                    <label className="text-sm font-semibold text-foreground">Message Timestamps</label>
                    <p className="text-xs text-neutral-500 mt-0.5">Show time stamps below chat messages.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      defaultChecked={localStorage.getItem('show_timestamps') !== 'false'}
                      onChange={(e) => localStorage.setItem('show_timestamps', String(e.target.checked))}
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-background after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black" />
                  </label>
                </div>

                <ThemeToggle />

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Auto-save Drafts</label>
                    <p className="text-xs text-neutral-500 mt-0.5">Automatically save unsent messages as drafts.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      defaultChecked={localStorage.getItem('auto_drafts') !== 'false'}
                      onChange={(e) => localStorage.setItem('auto_drafts', String(e.target.checked))}
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-background after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black" />
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
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
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
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
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
                        <div className="absolute z-10 mt-1 w-full bg-background border border-neutral-200 rounded-[10px] shadow-lg overflow-hidden">
                          <div className="overflow-y-auto thin-scrollbar" style={{ maxHeight: 155 }}>
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

            {activeTab === 'web-search' && (
              <div className="space-y-5">
                {!searchKeysLoaded ? (
                  <div className="flex items-center justify-center py-12 text-neutral-400 text-sm">Loading...</div>
                ) : (
                  <>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-700 leading-relaxed">
                        Configure web search providers. API keys are stored securely in the local database.
                        At minimum, set a <strong>Search Provider</strong> (Tavily recommended) for web search.
                        <strong>Google Custom Search</strong> handles image search;
                        <strong>Exa</strong> handles news search (falls back to Tavily).
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-foreground">Search Provider</label>
                      <select
                        className="h-10 bg-neutral-50 rounded-[10px] px-3 text-sm outline-none w-full border border-neutral-200 focus:border-black transition-all appearance-none cursor-pointer"
                        value={searchConfig['search-provider'] || 'tavily'}
                        onChange={(e) => setSearchConfig(p => ({ ...p, 'search-provider': e.target.value }))}
                      >
                        <option value="tavily">Tavily (Recommended)</option>
                        <option value="exa">Exa</option>
                        <option value="firecrawl">Firecrawl</option>
                        <option value="google">Google Custom Search</option>
                      </select>
                      <p className="text-xs text-neutral-500">Provider used for general web search.</p>
                    </div>

                    <div className="border-t border-neutral-100 pt-4 space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-medium text-neutral-600 ml-1">Tavily API Key</label>
                        <div className="relative">
                          <input
                          type={showSearchKeys['tavily'] ? 'text' : 'password'}
                             className="h-9 bg-neutral-50 rounded-[8px] pl-3 pr-9 outline-none text-sm w-full border border-neutral-200 focus:border-neutral-400 transition-colors"
                             placeholder={searchConfig['search-api-key'] ? '••••••••••••••••' : 'Enter Tavily API Key'}
                             value={searchConfig['search-api-key'] || ''}
                             onChange={(e) => setSearchConfig(p => ({ ...p, 'search-api-key': e.target.value }))}
                           />
                           <button
                             type="button"
                             onClick={() => setShowSearchKeys(p => ({ ...p, tavily: !p.tavily }))}
                             className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600 p-0.5"
                           >
                             <HugeiconsIcon icon={showSearchKeys['tavily'] ? ViewOffSlashIcon : ViewIcon} size={15} />
                          </button>
                        </div>
                        <p className="text-xs text-neutral-400">Get a free key at <span className="font-mono">tavily.com</span></p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-medium text-neutral-600 ml-1">Exa API Key <span className="text-neutral-400">(for news search)</span></label>
                        <div className="relative">
                          <input
                            type={showSearchKeys['exa'] ? 'text' : 'password'}
                            className="h-9 bg-neutral-50 rounded-[8px] pl-3 pr-9 outline-none text-sm w-full border border-neutral-200 focus:border-neutral-400 transition-colors"
                            placeholder={searchConfig['search-exa-api-key'] ? '••••••••••••••••' : 'Enter Exa API Key'}
                            value={searchConfig['search-exa-api-key'] || ''}
                            onChange={(e) => setSearchConfig(p => ({ ...p, 'search-exa-api-key': e.target.value }))}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSearchKeys(p => ({ ...p, exa: !p.exa }))}
                            className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600 p-0.5"
                          >
                            <HugeiconsIcon icon={showSearchKeys['exa'] ? ViewOffSlashIcon : ViewIcon} size={15} />
                          </button>
                        </div>
                        <p className="text-xs text-neutral-400">1,000 free queries/mo at <span className="font-mono">exa.ai</span>. Used for news search (falls back to Tavily).</p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-medium text-neutral-600 ml-1">Firecrawl API Key <span className="text-neutral-400">(for page scraping)</span></label>
                        <div className="relative">
                          <input
                            type={showSearchKeys['firecrawl'] ? 'text' : 'password'}
                             className="h-9 bg-neutral-50 rounded-[8px] pl-3 pr-9 outline-none text-sm w-full border border-neutral-200 focus:border-neutral-400 transition-colors"
                             placeholder={searchConfig['search-firecrawl-api-key'] ? '••••••••••••••••' : 'Enter Firecrawl API Key'}
                             value={searchConfig['search-firecrawl-api-key'] || ''}
                             onChange={(e) => setSearchConfig(p => ({ ...p, 'search-firecrawl-api-key': e.target.value }))}
                           />
                           <button
                             type="button"
                             onClick={() => setShowSearchKeys(p => ({ ...p, firecrawl: !p.firecrawl }))}
                             className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600 p-0.5"
                           >
                             <HugeiconsIcon icon={showSearchKeys['firecrawl'] ? ViewOffSlashIcon : ViewIcon} size={15} />
                          </button>
                        </div>
                        <p className="text-xs text-neutral-400">Best for fetching full page content. Get a key at <span className="font-mono">firecrawl.dev</span></p>
                      </div>



                      <div className="border-t border-neutral-100 pt-4">
                        <details className="group">
                          <summary className="text-sm font-medium text-neutral-600 cursor-pointer hover:text-card-foreground list-none flex items-center gap-2">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-open:rotate-90">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                            Google Custom Search <span className="text-neutral-400 font-normal">(fallback)</span>
                          </summary>
                          <div className="mt-3 space-y-3 pl-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[12px] font-medium text-neutral-600 ml-1">Google API Key</label>
                              <div className="relative">
                                <input
                                  type={showSearchKeys['google'] ? 'text' : 'password'}
                                   className="h-9 bg-neutral-50 rounded-[8px] pl-3 pr-9 outline-none text-sm w-full border border-neutral-200 focus:border-neutral-400 transition-colors"
                                   placeholder={searchConfig['search-google-api-key'] ? '••••••••••••••••' : 'Enter Google API Key'}
                                   value={searchConfig['search-google-api-key'] || ''}
                                   onChange={(e) => setSearchConfig(p => ({ ...p, 'search-google-api-key': e.target.value }))}
                                 />
                                 <button
                                   type="button"
                                   onClick={() => setShowSearchKeys(p => ({ ...p, google: !p.google }))}
                                   className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600 p-0.5"
                                 >
                                   <HugeiconsIcon icon={showSearchKeys['google'] ? ViewOffSlashIcon : ViewIcon} size={15} />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[12px] font-medium text-neutral-600 ml-1">CX (Engine ID)</label>
                              <input
                                type="text"
                                className="h-9 bg-neutral-50 rounded-[8px] pl-3 pr-3 outline-none text-sm w-full border border-neutral-200 focus:border-neutral-400 transition-colors"
                                placeholder={searchConfig['search-google-cx'] ? '••••••••••••••••' : 'Enter CX (Engine ID)'}
                                value={searchConfig['search-google-cx'] || ''}
                                onChange={(e) => setSearchConfig(p => ({ ...p, 'search-google-cx': e.target.value }))}
                              />
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-neutral-100">
                      <button
                        onClick={async () => {
                          setIsSaving(true);
                          await Promise.all(
                            Object.entries(searchConfig).map(([key, value]) =>
                              DatabaseService.setConfig(key, value)
                            )
                          );
                          await new Promise((r) => setTimeout(r, 200));
                          setIsSaving(false);
                        }}
                        disabled={isSaving}
                        className="mt-4 px-6 py-2 text-sm font-bold text-white bg-black hover:bg-neutral-800 rounded-[10px] transition-all flex items-center gap-2 shadow-lg shadow-black/5 active:scale-[0.98] disabled:opacity-50"
                      >
                        {isSaving ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : null}
                        Save Search Settings
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">Sidebar on Startup</label>
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

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">Zoom Level</label>
                  <ZoomControl />
                </div>
              </div>
            )}

            {activeTab === 'behavior' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Enable Thinking by Default</label>
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
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-background after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black" />
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Auto-create Artifacts</label>
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
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-background after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black" />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'storage' && (
              <div className="space-y-6">
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Local Database</h4>
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
                    className="w-full px-4 py-2.5 text-sm font-semibold text-foreground bg-neutral-100 hover:bg-neutral-200 rounded-[10px] transition-colors text-left"
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
                    className="w-full px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-[14px] transition-colors text-left"
                  >
                    Clear Chat History
                  </button>

                  <button
                    onClick={async () => {
                      if (await confirmAsync('Reset onboarding tour? You will see the welcome screens again on next launch.')) {
                        localStorage.removeItem('onboarding_completed');
                      }
                    }}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-foreground bg-neutral-100 hover:bg-neutral-200 rounded-[10px] transition-colors text-left"
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

const THEME_KEY = 'theme';

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <label className="text-sm font-semibold text-foreground">Appearance</label>
        <p className="text-xs text-neutral-500 mt-0.5">Switch between light and dark theme.</p>
      </div>
      <button
        onClick={toggle}
        className="relative w-16 h-8 rounded-full border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors flex items-center px-1"
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
            isDark ? 'translate-x-8 bg-neutral-700' : 'translate-x-0 bg-amber-400'
          }`}
        >
          {isDark ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          )}
        </div>
      </button>
    </div>
  );
}

const ZOOM_PRESETS = [0.5, 0.65, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 2];

function ZoomControl() {
  const { zoom, setZoomLevel, resetZoom } = useZoomContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-sm border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-neutral-500">
          <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9 9L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M6 4V8M4 6H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {Math.round(zoom * 100)}%
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-background border border-neutral-200 rounded-xl shadow-xl py-2 z-50">
          <div className="px-4 py-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
            Zoom
          </div>
          <div className="px-2 py-1 flex flex-col gap-0.5">
            {ZOOM_PRESETS.map((level) => (
              <button
                key={level}
                onClick={() => {
                  setZoomLevel(level);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  zoom === level
                    ? 'bg-neutral-100 text-foreground font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-foreground'
                }`}
              >
                {Math.round(level * 100)}%
              </button>
            ))}
          </div>
          <div className="border-t border-neutral-100 mt-1 pt-1 px-2">
            <button
              onClick={() => {
                resetZoom();
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-500 hover:bg-neutral-50 hover:text-foreground transition-colors"
            >
              Reset to 100%
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
