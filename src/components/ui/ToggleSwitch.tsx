interface ToggleSwitchProps {
  label: string;
  description?: string;
  defaultChecked?: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleSwitch({ label, description, defaultChecked, onChange }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <label className="text-sm font-semibold text-foreground">{label}</label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          defaultChecked={defaultChecked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent" />
      </label>
    </div>
  );
}
