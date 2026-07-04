import React, { createContext, useContext, useState, useCallback, useRef, useEffect, memo } from 'react';

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  confirmAsync: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const iconMap: Record<ToastType, React.ReactNode> = {
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  success: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

const toastStyles: Record<ToastType, string> = {
  info: 'bg-blue-900/20 border-blue-800 text-blue-400',
  success: 'bg-emerald-900/20 border-emerald-800 text-emerald-400',
  error: 'bg-red-900/20 border-red-800 text-red-400',
  warning: 'bg-amber-900/20 border-amber-800 text-amber-400',
};

const iconStyles: Record<ToastType, string> = {
  info: 'text-blue-500',
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
};

const ToastItem = memo(function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    if (!toast.duration) return;
    const timer = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg ${toastStyles[toast.type]} animate-in slide-in-from-right fade-in duration-300`}
      style={{ minWidth: 280, maxWidth: 420 }}
    >
      <span className={`shrink-0 mt-0.5 ${iconStyles[toast.type]}`}>
        {iconMap[toast.type]}
      </span>
      <p className="text-sm leading-relaxed">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 ml-auto text-current opacity-50 hover:opacity-100 transition-opacity"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const idCounter = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = String(++idCounter.current);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const confirmAsync = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirm({ message, resolve });
    });
  }, []);

  const handleConfirm = useCallback((value: boolean) => {
    if (confirm) {
      confirm.resolve(value);
      setConfirm(null);
    }
  }, [confirm]);

  return (
    <ToastContext.Provider value={{ addToast, confirmAsync }}>
      {children}

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onRemove={removeToast} />
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
          <div className="bg-[#1a1a1a] rounded-xl shadow-2xl shadow-black/30 p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
            <p className="text-sm text-neutral-300 leading-relaxed">{confirm.message}</p>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => handleConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-400 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
