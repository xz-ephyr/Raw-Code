import { DatabaseService } from '../utils/DatabaseService';

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
  { id: 'openrouter/owl-alpha', provider: 'openrouter', label: 'OWL Alpha' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', provider: 'openrouter', label: 'Nemotron 3 Ultra 550B (free)', supportsThinking: true },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', provider: 'openrouter', label: 'Hermes 3 405B (free)' },
  { id: 'google/gemma-4-26b-a4b-it:free', provider: 'openrouter', label: 'Gemma 4 26B (free)' },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', provider: 'openrouter', label: 'Nemotron Nano 30B Reasoning (free)', supportsThinking: true },
  { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', provider: 'openrouter', label: 'Dolphin Mistral 24B (free)' },
  { id: 'nvidia/nemotron-nano-12b-v2-vl:free', provider: 'openrouter', label: 'Nemotron Nano 12B VL (free)', supportsThinking: true },
  { id: 'poolside/laguna-xs.2:free', provider: 'openrouter', label: 'Laguna XS (free)', supportsThinking: true },
  { id: 'nvidia/nemotron-nano-9b-v2:free', provider: 'openrouter', label: 'Nemotron Nano 9B (free)', supportsThinking: true },
  { id: 'liquid/lfm-2.5-1.2b-instruct:free', provider: 'openrouter', label: 'LFM 2.5 1.2B Instruct (free)' },
  { id: 'liquid/lfm-2.5-1.2b-thinking:free', provider: 'openrouter', label: 'LFM 2.5 1.2B Thinking (free)', supportsThinking: true },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', provider: 'openrouter', label: 'Llama 3.2 3B (free)' },

  // Cerebras
  { id: 'gpt-oss-120b', provider: 'cerebras', label: 'GPT OSS 120B', supportsThinking: true },
  { id: 'llama-3-3-70b', provider: 'cerebras', label: 'Llama 3.3 70B' },
  { id: 'llama4-scout-17b-16e-instruct', provider: 'cerebras', label: 'Llama 4 Scout' },
  { id: 'qwen-3-32b', provider: 'cerebras', label: 'Qwen 3 32B', supportsThinking: true },
  { id: 'deepSeek-r1-distill-llama-70B', provider: 'cerebras', label: 'DeepSeek R1 Distill 70B', supportsThinking: true },
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

export function getUsedModelsStorageKey(sessionId: string | undefined): string {
  return `used-models-${sessionId || 'new'}`;
}

const usedModelsCache = new Map<string, AIModel[]>();

export function getUsedModels(sessionId: string | undefined): AIModel[] {
  const key = getUsedModelsStorageKey(sessionId);

  const cached = usedModelsCache.get(key);
  if (cached) return cached;

  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as AIModel[];
      usedModelsCache.set(key, parsed);
      return parsed;
    }
  } catch {}

  return [];
}

export function markModelUsed(sessionId: string | undefined, model: AIModel) {
  const key = getUsedModelsStorageKey(sessionId);
  const used = getUsedModels(sessionId);
  if (!used.includes(model)) {
    used.push(model);
    usedModelsCache.set(key, used);
    const json = JSON.stringify(used);
    try { localStorage.setItem(key, json); } catch {}
    DatabaseService.setConfig(key, json).catch(() => {});
  }
}

export function getUnusedModels(sessionId: string | undefined): AIModel[] {
  const used = getUsedModels(sessionId);
  return getAIModels().filter(m => !used.includes(m));
}

export function resetUsedModels(sessionId: string | undefined) {
  const key = getUsedModelsStorageKey(sessionId);
  usedModelsCache.delete(key);
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

export function initUsedModelsCache(sessionId: string | undefined): Promise<void> {
  const key = getUsedModelsStorageKey(sessionId);
  cleanupUsedModelsStorage();
  return DatabaseService.getConfig(key).then(val => {
    if (val) {
      try { usedModelsCache.set(key, JSON.parse(val)); } catch {}
    }
  }).catch(() => {});
}

export function getNextExploringModel(sessionId: string | undefined): AIModel {
  const unused = getUnusedModels(sessionId);
  if (unused.length > 0) {
    const used = getUsedModels(sessionId);
    if (used.length > 0) {
      const lastProvider = getModelDefinition(used[used.length - 1])?.provider;
      const diffProvider = unused.find(m => getModelDefinition(m)?.provider !== lastProvider);
      if (diffProvider) {
        markModelUsed(sessionId, diffProvider);
        return diffProvider;
      }
    }
    const selected = unused[0];
    markModelUsed(sessionId, selected);
    return selected;
  }
  resetUsedModels(sessionId);
  markModelUsed(sessionId, DEFAULT_MODEL);
  return DEFAULT_MODEL;
}

export function getModelForChatRequest(sessionId: string | undefined): AIModel {
  return getStoredModelMode() === MODEL_MODES.rotate
    ? getNextExploringModel(sessionId)
    : getStoredSelectedModel();
}

export function getModelDefinition(modelId: string): ModelDefinition | undefined {
  return MODELS.find(m => m.id === modelId) || CLI_MODELS.find(m => m.id === modelId);
}
