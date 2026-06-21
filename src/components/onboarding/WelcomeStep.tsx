import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

interface WelcomeStepProps {
  onFullSetup: () => void;
  onQuickStart: () => void;
}

export function WelcomeStep({ onFullSetup, onQuickStart }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto gap-8 py-8">
      <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center shadow-lg">
        <HugeiconsIcon icon={PencilEdit02Icon} size={32} color="white" strokeWidth={1.5} />
      </div>

      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-neutral-900">Welcome to XZ</h1>
        <p className="text-neutral-500 text-lg leading-relaxed">
          Your AI-powered coding assistant. Chat with AI, edit code, manage projects,
          and build faster — all from one place.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full">
        {[
          { title: 'AI Chat', desc: 'Multi-model AI conversations' },
          { title: 'Code Editor', desc: 'Edit files with AI assistance' },
          { title: 'Projects', desc: 'Connect your codebase' },
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 text-center"
          >
            <div className="text-sm font-semibold text-neutral-800">{feature.title}</div>
            <div className="text-xs text-neutral-500 mt-1">{feature.desc}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onFullSetup}
          className="w-full py-3 rounded-xl bg-black text-white font-semibold text-sm hover:bg-neutral-800 transition-all active:scale-[0.98]"
        >
          Full Setup — get started properly
        </button>
        <button
          onClick={onQuickStart}
          className="w-full py-3 rounded-xl border border-neutral-200 text-neutral-700 font-semibold text-sm hover:bg-neutral-50 transition-all active:scale-[0.98]"
        >
          Quick Start — jump right in
        </button>
      </div>
    </div>
  );
}
