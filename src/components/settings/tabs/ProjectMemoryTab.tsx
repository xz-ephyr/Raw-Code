import { SettingsSection } from '@/components/settings/SettingsSection';

export function ProjectMemoryTab() {
  return (
    <div className="space-y-6">
      <SettingsSection title="Project Memory" description="Persistent context that follows your projects across sessions.">
        <div className="bg-muted p-4 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground">
            Project memory is no longer available. Use <strong>AGENTS.md</strong> files in your project root
            to define persistent context per project instead.
          </p>
        </div>
      </SettingsSection>
    </div>
  );
}
