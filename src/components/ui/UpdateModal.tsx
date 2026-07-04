import { useState, useCallback } from 'react';

interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
  date?: string;
}

interface UpdateModalProps {
  update: UpdateInfo;
  onInstall: () => Promise<void>;
  onLater: () => void;
}

export default function UpdateModal({ update, onInstall, onLater }: UpdateModalProps) {
  const [installing, setInstalling] = useState(false);

  const handleInstall = useCallback(async () => {
    setInstalling(true);
    try {
      await onInstall();
    } finally {
      setInstalling(false);
    }
  }, [onInstall]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
      <div className="bg-[#111110] rounded-xl shadow-2xl shadow-black/30 p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-neutral-100">Update Available</h2>
            <p className="text-sm text-neutral-400 mt-1">
              v{update.currentVersion} → v{update.version}
            </p>
          </div>
        </div>

        {update.body && (
          <div className="mt-4 p-3 bg-neutral-800 rounded-lg border border-neutral-700 max-h-40 overflow-y-auto">
            <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-wrap">{update.body}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onLater}
            disabled={installing}
            className="px-4 py-2 text-sm font-medium text-neutral-400 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            disabled={installing}
            className="px-4 py-2 text-sm font-medium text-white bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            {installing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Installing...
              </>
            ) : (
              'Install'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
