import { ZoomControl } from '../ZoomControl';
import { useTheme } from '@/contexts/ThemeContext';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { HugeiconsIcon } from '@hugeicons/react';
import { Sun01Icon, Moon02Icon } from '@hugeicons/core-free-icons';

const SIDEBAR_STORAGE_KEY = 'sidebar_collapsed';

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <SettingsSection title="Theme" description="Choose between light and dark appearance.">
        <div className="flex gap-2">
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
              theme === 'light'
                ? 'border-ring bg-accent text-accent-foreground'
                : 'border-border bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <HugeiconsIcon icon={Sun01Icon} size={16} />
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
              theme === 'dark'
                ? 'border-ring bg-accent text-accent-foreground'
                : 'border-border bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <HugeiconsIcon icon={Moon02Icon} size={16} />
            Dark
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title="Sidebar" description="Control the sidebar behavior on startup.">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Sidebar on Startup</label>
          <select
            className="h-9 bg-muted rounded-lg px-3 text-sm outline-none w-full border border-border focus:border-ring transition-all appearance-none cursor-pointer"
            defaultValue={localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true' ? 'collapsed' : 'expanded'}
            onChange={(e) => {
              localStorage.setItem(SIDEBAR_STORAGE_KEY, String(e.target.value === 'collapsed'));
            }}
          >
            <option value="expanded">Expanded</option>
            <option value="collapsed">Collapsed</option>
          </select>
          <p className="text-xs text-muted-foreground">Changes apply immediately on next load.</p>
        </div>
      </SettingsSection>

      <SettingsSection title="Zoom" description="Adjust the interface zoom level.">
        <ZoomControl />
      </SettingsSection>
    </div>
  );
}
