import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PencilEdit02Icon,
  FolderLibraryIcon,
  Settings02Icon,
  AlarmClockIcon,
} from '@hugeicons/core-free-icons';

interface TourStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface TourItem {
  icon: any;
  title: string;
  description: string;
  position: string;
}

const TOUR_ITEMS: TourItem[] = [
  {
    icon: PencilEdit02Icon,
    title: 'New Thread',
    description: 'Start a new AI conversation. Type anything — code questions, debugging help, or general chat.',
    position: 'top-8 left-8',
  },
  {
    icon: FolderLibraryIcon,
    title: 'Chat History',
    description: 'Browse your past conversations, search through them, and pick up where you left off.',
    position: 'top-8 left-48',
  },
  {
    icon: AlarmClockIcon,
    title: 'Schedule & Plugins',
    description: 'Schedule recurring tasks and extend functionality with plugins from the sidebar.',
    position: 'top-8 left-80',
  },
  {
    icon: Settings02Icon,
    title: 'Settings',
    description: 'Configure API keys, change models, adjust zoom, and customize your experience.',
    position: 'bottom-8 left-8',
  },
];

export function TourStep({ onComplete, onSkip }: TourStepProps) {
  const [current, setCurrent] = useState(0);
  const item = TOUR_ITEMS[current];

  const handleNext = () => {
    if (current < TOUR_ITEMS.length - 1) {
      setCurrent(current + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto gap-8 py-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-neutral-900">Quick Tour</h2>
        <p className="text-neutral-500 text-sm mt-1">
          {current + 1} of {TOUR_ITEMS.length} — key areas of the interface
        </p>
      </div>

      <div className="relative w-full aspect-[4/3] rounded-2xl border border-neutral-200 bg-neutral-50 overflow-hidden">
        <div className="absolute inset-0 p-4">
          <div className="w-48 h-full rounded-xl border border-neutral-200 bg-white/80" />
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-32 rounded-xl border border-neutral-200 bg-white" />

        <div className={`absolute ${item.position} transition-all duration-300`}>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-black text-white shadow-xl min-w-[200px]">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <HugeiconsIcon icon={item.icon} size={16} color="white" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{item.title}</div>
              <div className="text-xs text-white/70 mt-0.5 leading-relaxed">{item.description}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {TOUR_ITEMS.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === current ? 'bg-black' : 'bg-neutral-200'
            }`}
          />
        ))}
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={onSkip}
          className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 font-medium text-sm hover:bg-neutral-50 transition-all"
        >
          Skip tour
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-2.5 rounded-xl bg-black text-white font-medium text-sm hover:bg-neutral-800 transition-all active:scale-[0.98]"
        >
          {current < TOUR_ITEMS.length - 1 ? 'Next' : 'Done'}
        </button>
      </div>
    </div>
  );
}
