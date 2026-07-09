import { DatabaseService } from '../utils/DatabaseService';
import { useSessionStore } from '../../src/stores/sessionStore';

export type Provider = string;

export interface ModelDefinition {
  id: string;
  provider: Provider;
  label: string;
  supportsThinking?: boolean;
  cliId?: string;
}

export const MODELS: ModelDefinition[] = [
  { id: 'z-ai/glm-4.7-flash-free', provider: 'zenmux', label: 'GLM 4.7 Flash Free', supportsThinking: true },
  { id: 'deepseek/deepseek-v3.2', provider: 'zenmux', label: 'DeepSeek V3.2', supportsThinking: true },
  { id: 'z-ai/glm-4.6v-flash-free', provider: 'zenmux', label: 'GLM 4.6V Flash Free', supportsThinking: true },
  { id: 'anthropic/claude-fable-5-free', provider: 'zenmux', label: 'Claude Fable 5 Free', supportsThinking: true },
];

const CLI_MODELS: ModelDefinition[] = [];

export function getAIModels(): string[] {
  return [...MODELS.map(m => m.id), ...CLI_MODELS.map(m => m.id)];
}
export type AIModel = string;

export const DEFAULT_MODEL: AIModel = 'z-ai/glm-4.7-flash-free';

export const MODEL_MODES = {
  fixed: 'fixed',
  rotate: 'rotate',
} as const;

export type ModelMode = (typeof MODEL_MODES)[keyof typeof MODEL_MODES];

export const MODEL_MODE_STORAGE_KEY = 'model-mode';
export const SELECTED_MODEL_STORAGE_KEY = 'selected-model';

// Registry-based API keys are now in core/providers/providerRegistry.ts
// Use getProviderApiKeys() from '@core/providers' instead of this static map

function isAIModel(model: string | null): model is AIModel {
  return getAIModels().includes(model as string);
}

function isModelMode(mode: string | null): mode is ModelMode {
  return mode === MODEL_MODES.fixed || mode === MODEL_MODES.rotate;
}

export function getStoredSelectedModel(): AIModel {
  const storedModel = localStorage.getItem(SELECTED_MODEL_STORAGE_KEY);
  return isAIModel(storedModel) ? storedModel : DEFAULT_MODEL;
}

export function getStoredModelMode(): ModelMode {
  const storedMode = localStorage.getItem(MODEL_MODE_STORAGE_KEY);
  return isModelMode(storedMode) ? storedMode : MODEL_MODES.fixed;
}

function getUsedModelsStorageKey(projectId?: string, sessionId?: string): string {
  if (projectId && sessionId) return `used-models-${projectId}-${sessionId}`;
  if (projectId) return `used-models-${projectId}`;
  if (sessionId) return `used-models-${sessionId}`;
  return 'used-models-new';
}

export function getUsedModels(projectId: string | undefined, sessionId?: string): AIModel[] {
  if (projectId) {
    const store = useSessionStore.getState();
    return store.usedModels[projectId] || [];
  }

  const key = getUsedModelsStorageKey(undefined, sessionId);
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as AIModel[];
  } catch {}

  return [];
}

export function markModelUsed(projectId: string | undefined, model: AIModel, sessionId?: string) {
  if (projectId) {
    const store = useSessionStore.getState();
    const current = store.usedModels[projectId] || [];
    if (!current.includes(model)) {
      store.markModelUsed(projectId, model);
    }
    return;
  }

  const key = getUsedModelsStorageKey(undefined, sessionId);
  const used = getUsedModels(undefined, sessionId);
  if (!used.includes(model)) {
    used.push(model);
    const json = JSON.stringify(used);
    try { localStorage.setItem(key, json); } catch {}
    DatabaseService.setConfig(key, json).catch(() => {});
  }
}

function getUnusedModels(projectId: string | undefined, sessionId?: string): AIModel[] {
  const used = getUsedModels(projectId, sessionId);
  return getAIModels().filter(m => !used.includes(m));
}

function resetUsedModels(projectId: string | undefined, sessionId?: string) {
  if (projectId) {
    const store = useSessionStore.getState();
    store.resetUsedModels(projectId);
    return;
  }

  const key = getUsedModelsStorageKey(undefined, sessionId);
  try { localStorage.removeItem(key); } catch {}
  DatabaseService.setConfig(key, '').catch(() => {});
}

let cleanedUp = false;

function cleanupUsedModelsStorage() {
  if (cleanedUp) return;
  cleanedUp = true;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('used-models-')) {
        localStorage.removeItem(key);
      }
    }
  } catch {}
}

export function initUsedModelsCache(projectId: string | undefined, sessionId?: string): Promise<void> {
  if (projectId) {
    return Promise.resolve();
  }

  const key = getUsedModelsStorageKey(undefined, sessionId);
  cleanupUsedModelsStorage();
  return DatabaseService.getConfig(key).then(val => {
    if (val) {
      try { localStorage.setItem(key, val); } catch {}
    }
  }).catch(() => {});
}

function getNextExploringModel(projectId: string | undefined, sessionId?: string): AIModel {
  const unused = getUnusedModels(projectId, sessionId);
  if (unused.length > 0) {
    const used = getUsedModels(projectId, sessionId);
    if (used.length > 0) {
      const lastProvider = getModelDefinition(used[used.length - 1])?.provider;
      const diffProvider = unused.find(m => getModelDefinition(m)?.provider !== lastProvider);
      if (diffProvider) {
        markModelUsed(projectId, diffProvider, sessionId);
        return diffProvider;
      }
    }
    const selected = unused[0];
    markModelUsed(projectId, selected, sessionId);
    return selected;
  }
  resetUsedModels(projectId, sessionId);
  markModelUsed(projectId, DEFAULT_MODEL, sessionId);
  return DEFAULT_MODEL;
}

export function getModelForChatRequest(sessionId: string | undefined, projectId?: string): AIModel {
  return getStoredModelMode() === MODEL_MODES.rotate
    ? getNextExploringModel(projectId, sessionId)
    : getStoredSelectedModel();
}

export function getModelDefinition(modelId: string): ModelDefinition | undefined {
  return MODELS.find(m => m.id === modelId) || CLI_MODELS.find(m => m.id === modelId);
}
