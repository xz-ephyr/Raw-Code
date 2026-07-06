import { ZoomControl } from '../ZoomControl';

const SIDEBAR_STORAGE_KEY = 'sidebar_collapsed';

export function AppearanceTab() {
  return (
    <div className="space-y-6">
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
        <p className="text-xs text-muted-foreground">
          Changes apply immediately on next load.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Zoom Level</label>
        <ZoomControl />
      </div>
    </div>
  );
}
