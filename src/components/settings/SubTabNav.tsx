import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

interface SubTabNavProps {
  tabs: readonly { id: string; label: string; icon: IconSvgElement }[];
  activeId: string;
  onChange: (id: string) => void;
}

export function SubTabNav({ tabs, activeId, onChange }: SubTabNavProps) {
  const activeIndex = tabs.findIndex(t => t.id === activeId);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let nextIndex: number | undefined;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = (activeIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = (activeIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = tabs.length - 1;
        break;
    }
    if (nextIndex !== undefined) {
      onChange(tabs[nextIndex].id);
    }
  };

  return (
    <div className="flex gap-1 border border-border rounded-lg p-0.5" role="tablist" onKeyDown={handleKeyDown}>
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
              isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <HugeiconsIcon icon={tab.icon} size={12} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
