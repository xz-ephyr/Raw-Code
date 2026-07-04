import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

export function GeneralTab() {
  return (
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

      <ToggleSwitch
        label="Message Timestamps"
        description="Show time stamps below chat messages."
        defaultChecked={localStorage.getItem('show_timestamps') !== 'false'}
        onChange={(checked) => localStorage.setItem('show_timestamps', String(checked))}
      />

      <ToggleSwitch
        label="Auto-save Drafts"
        description="Automatically save unsent messages as drafts."
        defaultChecked={localStorage.getItem('auto_drafts') !== 'false'}
        onChange={(checked) => localStorage.setItem('auto_drafts', String(checked))}
      />
    </div>
  );
}
