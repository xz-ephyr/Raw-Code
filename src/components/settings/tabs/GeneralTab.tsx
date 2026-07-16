import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { Dropdown } from '@/components/ui/Dropdown';
import { DefaultModelSelector } from '@/components/ui/DefaultModelSelector';
import { useLocalStorageSetting } from '@/hooks/useLocalStorageSetting';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ZoomControl } from '@/components/settings/ZoomControl';
import { useTheme } from '@/contexts/ThemeContext';
import { SELECTED_MODEL_STORAGE_KEY, MODELS } from '@core/config/models';

const STYLE_OPTIONS = [
  { value: 'concise', label: 'Concise', desc: 'Short, direct answers' },
  { value: 'balanced', label: 'Balanced', desc: 'Clear with reasonable detail' },
  { value: 'detailed', label: 'Detailed', desc: 'In-depth with examples' },
] as const;

const DEFAULT_MODEL_ID = MODELS.length > 0 ? MODELS[0].id : 'gemini-2.5-flash';

export function GeneralTab() {
  const { theme, setTheme } = useTheme();
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const stored = localStorage.getItem(SELECTED_MODEL_STORAGE_KEY);
    return stored || DEFAULT_MODEL_ID;
  });
  const [privacyMode, setPrivacyMode] = useLocalStorageSetting('privacy_mode', false);
  const [aiRules, setAiRules] = useLocalStorageSetting('ai_rules', '');
  const [enterToSend, setEnterToSend] = useLocalStorageSetting('enter_to_send', true);
  const [responseStyle, setResponseStyle] = useLocalStorageSetting('response_style', 'balanced');
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageSetting('sidebar_collapsed', false);
  const [styleOpen, setStyleOpen] = useState(false);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, modelId);
    window.dispatchEvent(new CustomEvent('model-changed'));
  };

  const currentStyle = STYLE_OPTIONS.find((s) => s.value === responseStyle) || STYLE_OPTIONS[1];

  return (
    <div className="space-y-6">
      <SettingsSection title="AI & Privacy" description="Control how the AI behaves and handles your data">
        <DefaultModelSelector selectedModel={selectedModel} onChange={handleModelChange} maxHeight="190px" />

        <ToggleSwitch
          label="Privacy Mode"
          description="Prevent your code and conversations from being used for model training."
          checked={privacyMode}
          onChange={setPrivacyMode}
        />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Custom Instructions</label>
          <textarea
            className="h-32 bg-muted rounded-md px-3 py-2.5 text-sm outline-none w-full border border-border focus:border-ring transition-all resize-y"
            value={aiRules}
            onChange={(e) => setAiRules(e.target.value)}
            placeholder="e.g. Always use TypeScript, prefer functional components, write tests first..."
          />
          <p className="text-xs text-muted-foreground">
            Instructions the AI follows in every conversation. Like a system prompt for your entire workflow.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Response Detail</label>
          <div className="relative">
            <div
              className="h-10 bg-muted rounded-md px-3 text-sm outline-none w-full border border-border flex items-center cursor-pointer"
              onClick={() => setStyleOpen(!styleOpen)}
            >
              <span className="flex-1 truncate">{currentStyle.label} — {currentStyle.desc}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} size={16} className="text-muted-foreground shrink-0" />
            </div>
            <Dropdown isOpen={styleOpen} onClose={() => setStyleOpen(false)} width="100%">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2 ${
                    responseStyle === opt.value ? 'bg-muted font-medium' : ''
                  }`}
                  onClick={() => {
                    setResponseStyle(opt.value);
                    setStyleOpen(false);
                  }}
                >
                  <span className="flex-1">
                    <span className="text-foreground">{opt.label}</span>
                    <span className="text-muted-foreground ml-1">— {opt.desc}</span>
                  </span>
                  {responseStyle === opt.value && (
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-green-500 shrink-0" />
                  )}
                </button>
              ))}
            </Dropdown>
          </div>
          <p className="text-xs text-muted-foreground">How detailed the AI responses should be by default.</p>
        </div>

        <ToggleSwitch
          label="Enter to Send"
          description="Press Enter to send messages. Disable to use Ctrl+Enter instead."
          checked={enterToSend}
          onChange={setEnterToSend}
        />
      </SettingsSection>

      <SettingsSection title="Appearance" description="Customize how the interface looks and behaves">
        <ToggleSwitch
          label="Dark Mode"
          description="Switch between light and dark theme."
          checked={theme === 'dark'}
          onChange={(enabled) => setTheme(enabled ? 'dark' : 'light')}
        />

        <ToggleSwitch
          label="Collapse Sidebar on Startup"
          description="Start with the sidebar closed."
          checked={sidebarCollapsed}
          onChange={setSidebarCollapsed}
        />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Interface Zoom</p>
            <p className="text-xs text-muted-foreground mt-0.5">Adjust the overall UI scaling</p>
          </div>
          <ZoomControl />
        </div>
      </SettingsSection>
    </div>
  );
}
