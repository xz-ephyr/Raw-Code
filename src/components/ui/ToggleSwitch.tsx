interface ToggleSwitchProps {
  label: string;
  description?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleSwitch({ label, description, defaultChecked, checked, onChange }: ToggleSwitchProps) {
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : defaultChecked;

  return (
    <div className="flex items-center justify-between">
      <div className="pr-4">
        <label className="text-sm font-semibold text-foreground">{label}</label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(isControlled ? !checked : !defaultChecked)}
        className="group relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span
          className={`absolute inset-0 rounded-full transition-all duration-300 ease-out ${
            on
              ? 'bg-gradient-to-r from-blue-600 to-indigo-900 shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]'
              : 'bg-neutral-200 dark:bg-neutral-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]'
          }`}
        />
        <span
          className={`pointer-events-none relative inline-block h-[22px] w-[22px] rounded-full bg-white transition-all duration-300 ease-out mt-[3px] ${
            on
              ? 'translate-x-[23px] shadow-[0_2px_8px_rgba(37,99,235,0.4)] group-hover:shadow-[0_2px_12px_rgba(37,99,235,0.6)]'
              : 'translate-x-[3px] shadow-[0_1px_4px_rgba(0,0,0,0.1)] group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
          }`}
        />
      </button>
    </div>
  );
}
