import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

interface SessionTitleContextValue {
  sessionTitle: string;
  setTitle: (title: string) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  isTitleGenerating: boolean;
  setIsTitleGenerating: (v: boolean) => void;
}

const SessionTitleContext = createContext<SessionTitleContextValue | null>(null);

export function SessionTitleProvider({ children }: { children: ReactNode }) {
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionId, setSessionIdState] = useState<string | null>(null);
  const [isTitleGenerating, setIsTitleGenerating] = useState(false);

  const setTitle = useCallback((title: string) => {
    setSessionTitle(title);
  }, []);

  const setSessionId = useCallback((id: string | null) => {
    setSessionIdState(id);
  }, []);

  const value = useMemo(() => ({ sessionTitle, setTitle, sessionId, setSessionId, isTitleGenerating, setIsTitleGenerating }), [sessionTitle, setTitle, sessionId, setSessionId, isTitleGenerating, setIsTitleGenerating]);

  return (
    <SessionTitleContext.Provider value={value}>
      {children}
    </SessionTitleContext.Provider>
  );
}

export function useSessionTitle() {
  const ctx = useContext(SessionTitleContext);
  if (!ctx) {
    throw new Error('useSessionTitle must be used within a SessionTitleProvider');
  }
  return ctx;
}
