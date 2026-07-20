import { create } from 'zustand';

interface ThreadState {
  currentSessionId: string | null;
  isThinkingEnabled: boolean;
  isWebSearchEnabled: boolean;
  currentMode: string | undefined;
  selectedModel: string;
  modelRevision: number;
  isSettingsOpen: boolean;

  setCurrentSessionId: (id: string | null) => void;
  setIsThinkingEnabled: (enabled: boolean) => void;
  setIsWebSearchEnabled: (enabled: boolean) => void;
  setCurrentMode: (mode: string | undefined) => void;
  setSelectedModel: (model: string) => void;
  incrementModelRevision: () => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useProjectStore = create<ThreadState>((set) => ({
  currentSessionId: null,
  isThinkingEnabled: true,
  isWebSearchEnabled: false,
  currentMode: 'default',
  selectedModel: 'auto',
  modelRevision: 0,
  isSettingsOpen: false,

  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setIsThinkingEnabled: (enabled) => set({ isThinkingEnabled: enabled }),
  setIsWebSearchEnabled: (enabled) => set({ isWebSearchEnabled: enabled }),
  setCurrentMode: (mode) => {
    set({ currentMode: mode });
  },
  setSelectedModel: (model) => set({ selectedModel: model }),
  incrementModelRevision: () => set((state) => ({ modelRevision: state.modelRevision + 1 })),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
}));
