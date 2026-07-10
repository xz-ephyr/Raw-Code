import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SessionState {
  usedModels: Record<string, string[]>;
  collapsedSections: string[];
  lastActiveProject: string | null;

  setUsedModels: (projectId: string, models: string[]) => void;
  markModelUsed: (projectId: string, model: string) => void;
  setCollapsedSections: (sections: string[]) => void;
  setLastActiveProject: (id: string | null) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      usedModels: {},
      collapsedSections: [],
      lastActiveProject: null,

      setUsedModels: (projectId, models) =>
        set((state) => ({
          usedModels: { ...state.usedModels, [projectId]: models },
        })),

      markModelUsed: (projectId, model) =>
        set((state) => {
          const current = state.usedModels[projectId] || [];
          if (current.includes(model)) return state;
          return {
            usedModels: { ...state.usedModels, [projectId]: [...current, model] },
          };
        }),

      setCollapsedSections: (sections) => set({ collapsedSections: sections }),

      setLastActiveProject: (id) => set({ lastActiveProject: id }),
    }),
    {
      name: 'raw-code-session-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
