import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings02Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { SettingsTabLayout } from '@/components/settings/SettingsTabLayout';

export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-card">
      <SettingsTabLayout
        header={
          <div className="px-6 py-4 border-b border-border flex items-center gap-4 shrink-0">
            <button
              onClick={() => navigate('/thread/new')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              <span>Back to Home</span>
            </button>
            <h2 className="text-[18px] font-bold text-foreground flex items-center gap-2">
              <HugeiconsIcon icon={Settings02Icon} size={20} className="text-muted-foreground" />
              Settings
            </h2>
          </div>
        }
      />
    </div>
  );
}
