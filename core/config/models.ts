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
  { id: 'auto', provider: 'omniroute', label: 'Auto (Smart Routing)', supportsThinking: true },
  { id: 'auto/coding', provider: 'omniroute', label: 'Auto Coding', supportsThinking: true },
  { id: 'auto/cheap', provider: 'omniroute', label: 'Auto Cheap', supportsThinking: false },
  { id: 'auto/fast', provider: 'omniroute', label: 'Auto Fast', supportsThinking: false },
];

const CLI_MODELS: ModelDefinition[] = [];

export function getAIModels(): string[] {
  return [...MODELS.map(m => m.id), ...CLI_MODELS.map(m => m.id)];
}
export type AIModel = string;

export const DEFAULT_MODEL: AIModel = 'auto';

export const SELECTED_MODEL_STORAGE_KEY = 'selected-model';

function isAIModel(model: string | null): model is AIModel {
  return getAIModels().includes(model as string);
}

export function getStoredSelectedModel(): AIModel {
  const storedModel = localStorage.getItem(SELECTED_MODEL_STORAGE_KEY);
  return isAIModel(storedModel) ? storedModel : DEFAULT_MODEL;
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

export function getModelForChatRequest(_sessionId: string | undefined, _projectId?: string): AIModel {
  return getStoredSelectedModel();
}

export function getModelDefinition(modelId: string): ModelDefinition | undefined {
  return MODELS.find(m => m.id === modelId) || CLI_MODELS.find(m => m.id === modelId);
}
