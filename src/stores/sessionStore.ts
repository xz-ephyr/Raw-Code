import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SessionState {
  collapsedSections: string[];

  setCollapsedSections: (sections: string[]) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      collapsedSections: [],

      setCollapsedSections: (sections) => set({ collapsedSections: sections }),
    }),
    {
      name: 'doktor-session-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
