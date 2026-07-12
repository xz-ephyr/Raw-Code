import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, CheckmarkCircle01Icon, SidebarBottomIcon, ZoomIcon } from '@hugeicons/core-free-icons';
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
            className="h-32 bg-muted rounded-lg px-3 py-2.5 text-sm outline-none w-full border border-border focus:border-ring transition-all resize-y"
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
              className="h-10 bg-muted rounded-lg px-3 text-sm outline-none w-full border border-border flex items-center cursor-pointer"
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

      <div className="border-t border-border pt-5">
        <h3 className="text-sm font-bold text-foreground mb-3">Appearance</h3>
        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20 mb-5">
          <span className="text-sm font-medium text-foreground">Dark Mode</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={theme === 'dark'}
              onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
            />
            <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-accent peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-foreground after:rounded-full after:h-4 after:w-4 after:transition-all" />
          </label>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/30 flex items-center justify-center">
              <HugeiconsIcon icon={SidebarBottomIcon} size={16} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Collapse Sidebar on Startup</p>
              <p className="text-xs text-muted-foreground">Start with the sidebar closed</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              defaultChecked={localStorage.getItem('sidebar_collapsed') === 'true'}
              onChange={(e) => localStorage.setItem('sidebar_collapsed', String(e.target.checked))}
            />
            <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-accent peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-foreground after:rounded-full after:h-4 after:w-4 after:transition-all" />
          </label>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/30 flex items-center justify-center">
              <HugeiconsIcon icon={ZoomIcon} size={16} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Interface Zoom</p>
              <p className="text-xs text-muted-foreground">Adjust the overall UI scaling</p>
            </div>
          </div>
          <ZoomControl />
        </div>
      </div>
    </div>
  );
}
