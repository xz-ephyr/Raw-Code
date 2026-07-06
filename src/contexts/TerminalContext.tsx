import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface TerminalContextValue {
  visible: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const toggle = useCallback(() => setVisible((v) => !v), []);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  return (
    <TerminalContext.Provider value={{ visible, toggle, open, close }}>
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal(): TerminalContextValue {
  const ctx = useContext(TerminalContext);
  if (!ctx) throw new Error('useTerminal must be used within TerminalProvider');
  return ctx;
}
