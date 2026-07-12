import { create } from 'zustand';

interface ThreadState {
  currentSessionId: string | null;
  isThinkingEnabled: boolean;
  isWebSearchEnabled: boolean;
  currentMode: string | undefined;
  selectedModel: string;
  modelRevision: number;

  setCurrentSessionId: (id: string | null) => void;
  setIsThinkingEnabled: (enabled: boolean) => void;
  setIsWebSearchEnabled: (enabled: boolean) => void;
  setCurrentMode: (mode: string | undefined) => void;
  setSelectedModel: (model: string) => void;
  incrementModelRevision: () => void;
}

export const useProjectStore = create<ThreadState>((set) => ({
  currentSessionId: null,
  isThinkingEnabled: false,
  isWebSearchEnabled: false,
  currentMode: 'explorer',
  selectedModel: 'auto',
  modelRevision: 0,

  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setIsThinkingEnabled: (enabled) => set({ isThinkingEnabled: enabled }),
  setIsWebSearchEnabled: (enabled) => set({ isWebSearchEnabled: enabled }),
  setCurrentMode: (mode) => {
    set({ currentMode: mode });
  },
  setSelectedModel: (model) => set({ selectedModel: model }),
  incrementModelRevision: () => set((state) => ({ modelRevision: state.modelRevision + 1 })),
}));
