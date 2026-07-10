import { SettingsTabLayout } from '@/components/settings/SettingsTabLayout';

export function SettingsPage() {
  return (
    <div className="flex flex-col h-screen bg-card">
      <div className="flex-1 min-h-0 overflow-hidden">
        <SettingsTabLayout />
      </div>
    </div>
  );
}
