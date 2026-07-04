import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit02Icon, Settings02Icon, FolderLibraryIcon } from '@hugeicons/core-free-icons';

interface PreferencesStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

const STORAGE_KEY = 'ai_preferences';

interface Preferences {
  style: string;
  expertise: string;
  focus: string[];
  customInstructions: string;
}

const DEFAULT_PREFERENCES: Preferences = {
  style: 'balanced',
  expertise: 'intermediate',
  focus: [],
  customInstructions: '',
};

const STYLE_OPTIONS = [
  { id: 'concise', label: 'Concise', desc: 'Short, direct answers' },
  { id: 'balanced', label: 'Balanced', desc: 'Clear with reasonable detail' },
  { id: 'detailed', label: 'Detailed', desc: 'In-depth with examples' },
];

const EXPERTISE_OPTIONS = [
  { id: 'beginner', label: 'Beginner', desc: 'Explain from the ground up' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Assume basic knowledge' },
  { id: 'expert', label: 'Expert', desc: 'Focus on advanced topics' },
];

const FOCUS_OPTIONS = [
  'Web (React, Next.js)',
  'Mobile (React Native)',
  'Backend (Node.js, Python)',
  'DevOps & Infrastructure',
  'Data Science & ML',
  'Game Development',
  'Desktop Apps (Tauri, Electron)',
  'CLI & Tooling',
];

function loadPreferences(): Preferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore JSON parse errors */ }
  return DEFAULT_PREFERENCES;
}

export function PreferencesStep({ onComplete, onSkip }: PreferencesStepProps) {
  const [prefs, setPrefs] = useState<Preferences>(loadPreferences);
  const [showCustom, setShowCustom] = useState(prefs.customInstructions.length > 0);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    onComplete();
  };

  const toggleFocus = (item: string) => {
    setPrefs(prev => ({
      ...prev,
      focus: prev.focus.includes(item)
        ? prev.focus.filter(f => f !== item)
        : [...prev.focus, item],
    }));
  };

  return (
    <div className="flex flex-col max-w-lg mx-auto gap-6 py-4 w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-neutral-100">AI Memory & Preferences</h2>
        <p className="text-neutral-400 text-sm mt-1">
          Help the AI understand how you like to work. These settings are stored locally.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
            Communication Style
          </label>
          <div className="grid grid-cols-3 gap-2">
            {STYLE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setPrefs(prev => ({ ...prev, style: opt.id }))}
                className={`p-3 rounded-xl border text-left transition-all ${
                  prefs.style === opt.id
                    ? 'border-black bg-neutral-800'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="text-sm font-semibold text-neutral-200">{opt.label}</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <HugeiconsIcon icon={Settings02Icon} size={16} />
            Expertise Level
          </label>
          <div className="grid grid-cols-3 gap-2">
            {EXPERTISE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setPrefs(prev => ({ ...prev, expertise: opt.id }))}
                className={`p-3 rounded-xl border text-left transition-all ${
                  prefs.expertise === opt.id
                    ? 'border-black bg-neutral-800'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="text-sm font-semibold text-neutral-200">{opt.label}</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
            <HugeiconsIcon icon={FolderLibraryIcon} size={16} />
            Coding Focus Areas
          </label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map(item => (
              <button
                key={item}
                onClick={() => toggleFocus(item)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-all ${
                  prefs.focus.includes(item)
                    ? 'border-black bg-neutral-700 text-white'
                    : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
<label className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
              <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
              Custom Instructions
            </label>
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="text-xs text-neutral-400 hover:text-neutral-300 underline underline-offset-2"
            >
              {showCustom ? 'Hide' : 'Add'}
            </button>
          </div>
          {showCustom && (
            <textarea
              className="w-full h-24 bg-neutral-800 rounded-xl px-4 py-3 text-sm border border-neutral-700 outline-none focus:border-neutral-400 transition-colors resize-none"
              placeholder="e.g. I prefer TypeScript over JavaScript, always use functional components with hooks..."
              value={prefs.customInstructions}
              onChange={(e) => setPrefs(prev => ({ ...prev, customInstructions: e.target.value }))}
            />
          )}
          <p className="text-[11px] text-neutral-400">
            These instructions will be included in every AI conversation to personalize responses.
          </p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onSkip}
          className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 font-medium text-sm hover:bg-neutral-800 transition-all"
        >
          Skip
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-xl bg-neutral-700 text-white font-medium text-sm hover:bg-neutral-600 transition-all active:scale-[0.98]"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
