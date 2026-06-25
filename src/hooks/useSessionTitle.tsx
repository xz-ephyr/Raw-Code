import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

interface SessionTitleContextValue {
  sessionTitle: string;
  title: string;
  setTitle: (title: string) => void;
  setSessionId: (id: string | null) => void;
  setUserEdited: (edited: boolean) => void;
  generateSessionTitle: (content: string) => Promise<string>;
}

const SessionTitleContext = createContext<SessionTitleContextValue | null>(null);

export function SessionTitleProvider({ children }: { children: ReactNode }) {
  const [sessionTitle, setSessionTitle] = useState('');
  const [, _setSessionId] = useState<string | null>(null);
  const [, _setUserEdited] = useState(false);
  const generatingRef = useRef(false);
  const pendingRef = useRef<string | null>(null);

  const setSessionId = useCallback((id: string | null) => _setSessionId(id), []);
  const setUserEdited = useCallback((edited: boolean) => _setUserEdited(edited), []);

  const setTitle = useCallback((title: string) => {
    setSessionTitle(title);
  }, []);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const generateSessionTitle = useCallback(async (content: string): Promise<string> => {
    if (generatingRef.current) {
      pendingRef.current = content;
      return sessionTitle;
    }

    generatingRef.current = true;

    try {
      const snippet = content.trim().slice(0, 60);
      const title = snippet.length > 0 ? snippet : 'New conversation';
      await new Promise((r) => setTimeout(r, 0));
      setSessionTitle(title);
      return title;
    } catch {
      return 'New conversation';
    } finally {
      generatingRef.current = false;
      if (pendingRef.current) {
        const next = pendingRef.current;
        pendingRef.current = null;
        generateSessionTitle(next);
      }
    }
  }, [sessionTitle]);

  return (
    <SessionTitleContext.Provider value={{ sessionTitle, title: sessionTitle, setTitle, setSessionId, setUserEdited, generateSessionTitle }}>
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
