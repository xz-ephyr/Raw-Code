import { SettingsTabLayout } from './SettingsTabLayout';
import { useProjectStore } from '@/stores/projectStore';

export function SettingsModal() {
  const isOpen = useProjectStore((s) => s.isSettingsOpen);
  const setSettingsOpen = useProjectStore((s) => s.setSettingsOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[100] p-4 sm:p-6"
      onClick={() => setSettingsOpen(false)}
    >
      <div
         className="relative bg-card rounded-2xl w-[1000px] max-w-[1000px] h-[700px] shadow-2xl shadow-black/50 border border-border flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 min-h-0">
          <SettingsTabLayout />
        </div>
      </div>
    </div>
  );
}
