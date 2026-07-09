import { HugeiconsIcon } from '@hugeicons/react';
import { Settings02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { SettingsTabLayout } from './SettingsTabLayout';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[4px] z-50">
      <div className="bg-card rounded-[16px] w-[min(1100px,95vw)] h-[85vh] min-h-[500px] shadow-2xl shadow-black/30 border border-border flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-[18px] font-bold text-foreground flex items-center gap-2">
            <HugeiconsIcon icon={Settings02Icon} size={20} className="text-muted-foreground" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        <SettingsTabLayout />
      </div>
    </div>
  );
}
