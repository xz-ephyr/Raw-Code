import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SessionState {
  collapsedSections: string[];
  lastActiveProject: string | null;

  setCollapsedSections: (sections: string[]) => void;
  setLastActiveProject: (id: string | null) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      collapsedSections: [],
      lastActiveProject: null,

      setCollapsedSections: (sections) => set({ collapsedSections: sections }),

      setLastActiveProject: (id) => set({ lastActiveProject: id }),
    }),
    {
      name: 'raw-code-session-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
