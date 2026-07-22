import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { PasswordInput } from '@/components/ui/PasswordInput';
import type { KeyProvider } from '@core/providers/providerRegistry';

interface ProviderKeyModalProps {
  provider: KeyProvider;
  currentKey: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => Promise<void>;
}

export function ProviderKeyModal({
  provider,
  currentKey,
  isOpen,
  onClose,
  onSave,
}: ProviderKeyModalProps) {
  const [key, setKey] = useState(currentKey);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(key);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in duration-200 ease-out">
        <div className="bg-sidebar border border-border/50 rounded-xl shadow-2xl overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors z-10"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={13} className="text-muted-foreground" />
          </button>

          <div className="px-6 pt-6 pb-5 space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <img src={provider.icon} alt={provider.label} loading="lazy" className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">{provider.label}</h2>
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">API Key</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">API Key</label>
                <PasswordInput
                  value={key}
                  onChange={setKey}
                  placeholder={`Enter ${provider.label} API Key`}
                  showKeyIcon
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg bg-foreground text-background hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save Key'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
