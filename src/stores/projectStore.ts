import { create } from 'zustand';
import type { ProjectContext } from '@core/memory/contextController';
import type { ProjectMemoryEntry } from '@core/memory/projectMemory';

interface ProjectState {
  currentProjectId: string | null;
  currentSessionId: string | null;
  projectContext: ProjectContext | null;
  projectMemory: ProjectMemoryEntry[];
  isThinkingEnabled: boolean;
  isWebSearchEnabled: boolean;
  currentMode: string | undefined;
  selectedModel: string;
  modelRevision: number;

  setCurrentProjectId: (id: string | null) => void;
  setCurrentSessionId: (id: string | null) => void;
  setProjectContext: (context: ProjectContext | null) => void;
  setProjectMemory: (memory: ProjectMemoryEntry[]) => void;
  setIsThinkingEnabled: (enabled: boolean) => void;
  setIsWebSearchEnabled: (enabled: boolean) => void;
  setCurrentMode: (mode: string | undefined) => void;
  setSelectedModel: (model: string) => void;
  incrementModelRevision: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProjectId: null,
  currentSessionId: null,
  projectContext: null,
  projectMemory: [],
  isThinkingEnabled: false,
  isWebSearchEnabled: true,
  currentMode: 'explorer',
  selectedModel: 'z-ai/glm-4.7-flash-free',
  modelRevision: 0,

  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setProjectContext: (context) => set({ projectContext: context }),
  setProjectMemory: (memory) => set({ projectMemory: memory }),
  setIsThinkingEnabled: (enabled) => set({ isThinkingEnabled: enabled }),
  setIsWebSearchEnabled: (enabled) => set({ isWebSearchEnabled: enabled }),
  setCurrentMode: (mode) => {
    set({ currentMode: mode });
  },
  setSelectedModel: (model) => set({ selectedModel: model }),
  incrementModelRevision: () => set((state) => ({ modelRevision: state.modelRevision + 1 })),
}));
