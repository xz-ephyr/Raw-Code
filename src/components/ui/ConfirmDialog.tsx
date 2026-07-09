import { useEffect, useRef } from 'react';

type ConfirmVariant = 'default' | 'danger' | 'warning';

interface ConfirmDialogProps {
  open: boolean;
  mode: 'modal' | 'inline';
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantAccents: Record<ConfirmVariant, { border: string; bg: string; hoverBg: string }> = {
  default: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-500/10',
    hoverBg: 'hover:bg-blue-500/15',
  },
  danger: {
    border: 'border-l-red-500',
    bg: 'bg-red-500/10',
    hoverBg: 'hover:bg-red-500/15',
  },
  warning: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-500/10',
    hoverBg: 'hover:bg-amber-500/15',
  },
};

function InlineConfirm({ title, message, confirmLabel, cancelLabel, variant, onConfirm, onCancel }: {
  title?: string; message: string; confirmLabel: string; cancelLabel: string;
  variant: ConfirmVariant; onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const accent = variantAccents[variant];

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  return (
    <div
      ref={ref}
      className={`border-l-4 ${accent.border} ${accent.bg} rounded-r-lg px-4 py-3 my-2 animate-in fade-in slide-in-from-bottom-2 duration-200`}
    >
      {title && <p className="text-sm font-semibold text-foreground mb-1">{title}</p>}
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onConfirm}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            variant === 'danger'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : variant === 'warning'
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {confirmLabel}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-sm font-medium text-muted-foreground bg-muted hover:bg-accent rounded-md transition-colors"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

function ModalConfirm({ open, title, message, confirmLabel, cancelLabel, variant, onConfirm, onCancel }: {
  open: boolean; title?: string; message: string; confirmLabel: string; cancelLabel: string;
  variant: ConfirmVariant; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 animate-in fade-in duration-200">
      <div className="bg-card rounded-xl shadow-2xl shadow-black/30 p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        {title && <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>}
        <p className="text-sm text-foreground leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted hover:bg-accent rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              variant === 'danger'
                ? 'text-white bg-red-600 hover:bg-red-700'
                : variant === 'warning'
                ? 'text-white bg-amber-600 hover:bg-amber-700'
                : 'text-accent-foreground bg-accent hover:bg-accent/80'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, mode, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  if (mode === 'inline') {
    return (
      <InlineConfirm
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        variant={variant}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  }

  return (
    <ModalConfirm
      open={open}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      variant={variant}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
