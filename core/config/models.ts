import { DatabaseService } from '../utils/DatabaseService';
import { useSessionStore } from '../../src/stores/sessionStore';

export type Provider =
  | 'google'
  | 'groq'
  | 'mistral'
  | 'openrouter'
  | 'cerebras'
  | 'opencodezen'
  | 'cli';

export interface ModelDefinition {
  id: string;
  provider: Provider;
  label: string;
  supportsThinking?: boolean;
  cliId?: string;
}

export const ALLOWED_PROVIDERS: Provider[] = [
  'google', 'groq', 'opencodezen', 'mistral', 'openrouter', 'cerebras',
];

export const MODELS: ModelDefinition[] = [
  // Google
  { id: 'gemini-3.5-flash', provider: 'google', label: 'Gemini 3.5 Flash', supportsThinking: true },
  { id: 'gemini-3-flash-preview', provider: 'google', label: 'Gemini 3 Flash Preview', supportsThinking: true },
  { id: 'gemma-4-31b-it', provider: 'google', label: 'Gemma 4 31B IT' },
  { id: 'gemini-2.5-flash', provider: 'google', label: 'Gemini 2.5 Flash', supportsThinking: true },
  { id: 'gemma-4-26b-a4b-it', provider: 'google', label: 'Gemma 4 26B A4B IT' },
  { id: 'gemini-2.5-flash-lite', provider: 'google', label: 'Gemini 2.5 Flash Lite', supportsThinking: true },

  // Groq
  { id: 'groq/compound', provider: 'groq', label: 'Compound (Groq)', supportsThinking: true },
  { id: 'groq/compound-mini', provider: 'groq', label: 'Compound Mini (Groq)', supportsThinking: true },
  { id: 'qwen/qwen3-32b', provider: 'groq', label: 'Qwen 3 32B (Groq)', supportsThinking: true },
  { id: 'llama-3.1-8b-instant', provider: 'groq', label: 'Llama 3.1 8B (Groq)' },
  { id: 'openai/gpt-oss-safeguard-20b', provider: 'groq', label: 'GPT OSS Safeguard 20B (Groq)', supportsThinking: true },

  // OpenCode Zen
  { id: 'deepseek-v4-flash-free', provider: 'opencodezen', label: 'DeepSeek V4 Flash Free', supportsThinking: true },
  { id: 'big-pickle', provider: 'opencodezen', label: 'Big Pickle', supportsThinking: true },
  { id: 'mimo-v2.5-free', provider: 'opencodezen', label: 'Mimo v2.5 Free', supportsThinking: true },

  // Mistral
  { id: 'mistral-large-latest', provider: 'mistral', label: 'Mistral Large' },
  { id: 'mistral-medium-latest', provider: 'mistral', label: 'Mistral Medium', supportsThinking: true },
  { id: 'mistral-small-latest', provider: 'mistral', label: 'Mistral Small', supportsThinking: true },
  { id: 'magistral-medium-latest', provider: 'mistral', label: 'Magistral Medium', supportsThinking: true },
  { id: 'devstral-latest', provider: 'mistral', label: 'Devstral' },
  { id: 'codestral-latest', provider: 'mistral', label: 'Codestral' },

  // OpenRouter (:free models)
  { id: 'tencent/hy3:free', provider: 'openrouter', label: 'Tencent HY3 (free)' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', provider: 'openrouter', label: 'Nemotron 3 Ultra 550B (free)', supportsThinking: true },
  { id: 'poolside/laguna-m.1:free', provider: 'openrouter', label: 'Laguna M.1 (free)', supportsThinking: true },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', provider: 'openrouter', label: 'Nemotron 3 Super 120B (free)', supportsThinking: true },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', provider: 'openrouter', label: 'Nemotron 3 Nano 30B (free)', supportsThinking: true },
  { id: 'openai/gpt-oss-20b:free', provider: 'openrouter', label: 'GPT OSS 20B (free)' },
  { id: 'nvidia/nemotron-nano-12b-v2-vl:free', provider: 'openrouter', label: 'Nemotron Nano 12B VL (free)', supportsThinking: true },
  { id: 'poolside/laguna-xs.2:free', provider: 'openrouter', label: 'Laguna XS (free)', supportsThinking: true },
  { id: 'nvidia/nemotron-nano-9b-v2:free', provider: 'openrouter', label: 'Nemotron Nano 9B (free)', supportsThinking: true },
  { id: 'openrouter/free', provider: 'openrouter', label: 'Auto Router (free)' },
  { id: 'cohere/north-mini-code:free', provider: 'openrouter', label: 'North Mini Code (free)' },
  { id: 'nvidia/nemotron-3.5-content-safety:free', provider: 'openrouter', label: 'Nemotron 3.5 Safe (free)' },

  // Cerebras (only 3 public models available)
  { id: 'gpt-oss-120b', provider: 'cerebras', label: 'GPT OSS 120B', supportsThinking: true },
  { id: 'zai-glm-4.7', provider: 'cerebras', label: 'GLM 4.7', supportsThinking: true },
  { id: 'gemma-4-31b', provider: 'cerebras', label: 'Gemma 4 31B' },
  { id: 'gpt-oss-120b', provider: 'cerebras', label: 'GPT OSS 120B (fast)', supportsThinking: true },
  { id: 'zai-glm-4.7', provider: 'cerebras', label: 'GLM 4.7 (reasoning)', supportsThinking: true },
];

export const CLI_MODELS: ModelDefinition[] = [];

export function getAIModels(): string[] {
  return [...MODELS.map(m => m.id), ...CLI_MODELS.map(m => m.id)];
}
export type AIModel = string;

export const DEFAULT_MODEL: AIModel = 'gemini-3.5-flash';

export const THINKING_MODELS = [...MODELS.filter(m => m.supportsThinking).map(m => m.id)];

export const MODEL_MODES = {
  fixed: 'fixed',
  rotate: 'rotate',
} as const;

export type ModelMode = (typeof MODEL_MODES)[keyof typeof MODEL_MODES];

export const MODEL_MODE_STORAGE_KEY = 'model-mode';
export const SELECTED_MODEL_STORAGE_KEY = 'selected-model';

export const API_KEYS = {
  google: 'api-key',
  groq: 'groq-api-key',
  mistral: 'mistral-api-key',
  openrouter: 'openrouter-api-key',
  cerebras: 'cerebras-api-key',
  opencodezen: 'opencodezen-api-key',
} as const;

export function isAIModel(model: string | null): model is AIModel {
  return getAIModels().includes(model as string);
}

export function isModelMode(mode: string | null): mode is ModelMode {
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

export function getUsedModelsStorageKey(projectId?: string, sessionId?: string): string {
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

export function getUnusedModels(projectId: string | undefined, sessionId?: string): AIModel[] {
  const used = getUsedModels(projectId, sessionId);
  return getAIModels().filter(m => !used.includes(m));
}

export function resetUsedModels(projectId: string | undefined, sessionId?: string) {
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

export function getNextExploringModel(projectId: string | undefined, sessionId?: string): AIModel {
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
