import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

export function BehaviorTab() {
  return (
    <div className="space-y-6">
      <ToggleSwitch
        label="Enable Thinking by Default"
        description="Show reasoning traces on supported models."
        defaultChecked={localStorage.getItem('thinking_default') === 'true'}
        onChange={(checked) => localStorage.setItem('thinking_default', String(checked))}
      />

      <ToggleSwitch
        label="Auto-create Artifacts"
        description="Automatically preview UI code as artifacts."
        defaultChecked={localStorage.getItem('auto_artifacts') !== 'false'}
        onChange={(checked) => localStorage.setItem('auto_artifacts', String(checked))}
      />
    </div>
  );
}
