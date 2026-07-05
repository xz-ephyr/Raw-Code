import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';
import { ZoomControl } from '../ZoomControl';

const SIDEBAR_STORAGE_KEY = 'sidebar_collapsed';
const THEME_STORAGE_KEY = 'app_theme';

export function AppearanceTab() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'dark');

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Theme</label>
        <button
          onClick={toggleTheme}
          className="h-10 bg-muted rounded-[10px] px-4 text-sm outline-none w-full border border-border focus:border-ring transition-all flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <HugeiconsIcon icon={theme === 'dark' ? Moon02Icon : Sun03Icon} size={16} />
            {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
          <span className="text-xs text-muted-foreground">Toggle</span>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Sidebar on Startup</label>
        <select
          className="h-10 bg-muted rounded-[10px] px-3 text-sm outline-none w-full border border-border focus:border-ring transition-all appearance-none cursor-pointer"
          defaultValue={localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true' ? 'collapsed' : 'expanded'}
          onChange={(e) => {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, String(e.target.value === 'collapsed'));
          }}
        >
          <option value="expanded">Expanded</option>
          <option value="collapsed">Collapsed</option>
        </select>
        <p className="text-xs text-neutral-400">
          Changes apply immediately on next load.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-neutral-300">Zoom Level</label>
        <ZoomControl />
      </div>
    </div>
  );
}
