export type Provider =
  | 'google'
  | 'groq'
  | 'mistral'
  | 'openai'
  | 'openrouter'
  | 'cerebras'
  | 'opencodezen'
  | 'github'
  | 'cloudflare'
  | 'cohere'
  | 'zai'
  | 'nvidia'
  | 'huggingface'
  | 'ollama'
  | 'kilo'
  | 'pollinations'
  | 'llm7'
  | 'ovh'
  | 'reka';

export interface ModelDefinition {
  id: string;
  provider: Provider;
  label: string;
  supportsThinking?: boolean;
}

export const MODELS: ModelDefinition[] = [
  // Google
  { id: 'gemini-3.5-flash', provider: 'google', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3-flash-preview', provider: 'google', label: 'Gemini 3 Flash Preview' },
  { id: 'gemma-4-31b-it', provider: 'google', label: 'Gemma 4 31B IT' },
  { id: 'gemini-2.5-flash', provider: 'google', label: 'Gemini 2.5 Flash' },
  { id: 'gemma-4-26b-a4b-it', provider: 'google', label: 'Gemma 4 26B A4B IT' },
  { id: 'gemini-2.5-flash-lite', provider: 'google', label: 'Gemini 2.5 Flash Lite' },

  // Groq
  { id: 'groq/compound', provider: 'groq', label: 'Compound (Groq)' },
  { id: 'groq/compound-mini', provider: 'groq', label: 'Compound Mini (Groq)' },
  { id: 'qwen/qwen3-32b', provider: 'groq', label: 'Qwen 3 32B (Groq)' },
  { id: 'llama-3.1-8b-instant', provider: 'groq', label: 'Llama 3.1 8B (Groq)' },
  { id: 'openai/gpt-oss-safeguard-20b', provider: 'groq', label: 'GPT OSS Safeguard 20B (Groq)' },

  // OpenCode Zen
  { id: 'deepseek-v4-flash-free', provider: 'opencodezen', label: 'DeepSeek V4 Flash (Zen)' },
  { id: 'big-pickle', provider: 'opencodezen', label: 'Big Pickle (Zen)' },
  { id: 'mimo-v2.5-free', provider: 'opencodezen', label: 'Mimo V2.5 (Zen)' },

  // Mistral
  { id: 'mistral-large-latest', provider: 'mistral', label: 'Mistral Large' },
  { id: 'mistral-medium-latest', provider: 'mistral', label: 'Mistral Medium' },
  { id: 'mistral-small-latest', provider: 'mistral', label: 'Mistral Small' },
  { id: 'magistral-medium-latest', provider: 'mistral', label: 'Magistral Medium' },
  { id: 'devstral-latest', provider: 'mistral', label: 'Devstral' },
  { id: 'codestral-latest', provider: 'mistral', label: 'Codestral' },

  // OpenRouter (free tier focus)
  { id: 'openrouter/owl-alpha', provider: 'openrouter', label: 'Owl Alpha' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', provider: 'openrouter', label: 'Nemotron 3 Ultra 550B' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', provider: 'openrouter', label: 'Hermes 3 Llama 3.1 405B' },
  { id: 'google/gemma-4-26b-a4b-it:free', provider: 'openrouter', label: 'Gemma 4 26B IT' },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', provider: 'openrouter', label: 'Nemotron 3 Nano Omni' },
  { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', provider: 'openrouter', label: 'Dolphin Mistral Venice' },
  { id: 'nvidia/nemotron-nano-12b-v2-vl:free', provider: 'openrouter', label: 'Nemotron Nano 12B VL' },
  { id: 'poolside/laguna-xs.2:free', provider: 'openrouter', label: 'Laguna XS.2' },
  { id: 'nvidia/nemotron-nano-9b-v2:free', provider: 'openrouter', label: 'Nemotron Nano 9B V2' },
  { id: 'liquid/lfm-2.5-1.2b-instruct:free', provider: 'openrouter', label: 'LFM 2.5 1.2B Instruct' },
  { id: 'liquid/lfm-2.5-1.2b-thinking:free', provider: 'openrouter', label: 'LFM 2.5 1.2B Thinking', supportsThinking: true },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', provider: 'openrouter', label: 'Llama 3.2 3B Instruct' },

  // GitHub Models
  { id: 'openai/gpt-4.1', provider: 'github', label: 'GPT-4.1 (GitHub)' },
  { id: 'gpt-4o', provider: 'github', label: 'GPT-4o (GitHub)' },

  // Cloudflare
  { id: '@cf/moonshotai/kimi-k2.6', provider: 'cloudflare', label: 'Kimi K2.6' },
  { id: '@cf/qwen/qwen3-30b-a3b-fp8', provider: 'cloudflare', label: 'Qwen 3 30B' },
  { id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', provider: 'cloudflare', label: 'DeepSeek R1 Distill' },
  { id: '@cf/nvidia/nemotron-3-120b-a12b', provider: 'cloudflare', label: 'Nemotron 3 120B' },
  { id: '@cf/zai-org/glm-4.7-flash', provider: 'cloudflare', label: 'GLM 4.7 Flash' },
  { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', provider: 'cloudflare', label: 'Llama 3.3 70B Fast' },
  { id: '@cf/meta/llama-4-scout-17b-16e-instruct', provider: 'cloudflare', label: 'Llama 4 Scout 17B' },
  { id: '@cf/google/gemma-4-26b-a4b-it', provider: 'cloudflare', label: 'Gemma 4 26B (CF)' },
  { id: '@cf/ibm-granite/granite-4.0-h-micro', provider: 'cloudflare', label: 'Granite 4.0 H-Micro' },

  // Cohere
  { id: 'command-a-reasoning-08-2025', provider: 'cohere', label: 'Command A Reasoning', supportsThinking: true },
  { id: 'command-r-08-2024', provider: 'cohere', label: 'Command R' },
  { id: 'command-a-03-2025', provider: 'cohere', label: 'Command A' },

  // Z.ai (Zhipu)
  { id: 'z-ai/glm-5.1', provider: 'zai', label: 'GLM 5.1' },
  { id: 'glm-4.7', provider: 'zai', label: 'GLM 4.7' },
  { id: 'glm-4.6v-flash', provider: 'zai', label: 'GLM 4.6V Flash' },

  // NVIDIA
  { id: 'deepseek-ai/deepseek-v4-pro', provider: 'nvidia', label: 'DeepSeek V4 Pro' },
  { id: 'minimaxai/minimax-m2.7', provider: 'nvidia', label: 'MiniMax M2.7' },
  { id: 'mistralai/mistral-large-3-675b-instruct-2512', provider: 'nvidia', label: 'Mistral Large 3' },
  { id: 'meta/llama-4-maverick-17b-128e-instruct', provider: 'nvidia', label: 'Llama 4 Maverick 17B' },
  { id: 'meta/llama-3.1-70b-instruct', provider: 'nvidia', label: 'Llama 3.1 70B' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', provider: 'nvidia', label: 'Nemotron 3 Super 120B' },
  { id: 'nvidia/nemotron-3-nano-30b-a3b', provider: 'nvidia', label: 'Nemotron 3 Nano' },

  // Others
  { id: 'stepfun/step-3.7-flash:free', provider: 'kilo', label: 'Step 3.7 Flash' },
  { id: 'poolside/laguna-m.1:free', provider: 'pollinations', label: 'Laguna M.1 (Pollinations)' },
  { id: 'qwen3-coder:480b', provider: 'llm7', label: 'Qwen 3 Coder 480B' },
  { id: 'Qwen/Qwen3-Coder-Next', provider: 'ovh', label: 'Qwen 3 Coder Next' },
  { id: 'reka-flash', provider: 'reka', label: 'Reka Flash' },
  { id: 'cerebras-llama-3.1-70b', provider: 'cerebras', label: 'Llama 3.1 70B (Cerebras)' },
  { id: 'deepseek-ai/DeepSeek-V4-Flash', provider: 'huggingface', label: 'DeepSeek V4 Flash' },
  { id: 'gpt-oss-120b', provider: 'pollinations', label: 'GPT OSS 120B' },
];

export const AI_MODELS = MODELS.map(m => m.id);
export type AIModel = string;

export const DEFAULT_MODEL: AIModel = 'gemini-3.5-flash';

export const THINKING_MODELS = MODELS.filter(m => m.supportsThinking).map(m => m.id);

export const MODEL_MODES = {
  fixed: 'fixed',
  rotate: 'rotate',
} as const;

export type ModelMode = (typeof MODEL_MODES)[keyof typeof MODEL_MODES];

export const MODEL_MODE_STORAGE_KEY = 'model-mode';
export const SELECTED_MODEL_STORAGE_KEY = 'selected-model';

// API Key Storage Keys
export const API_KEYS = {
  google: 'api-key',
  groq: 'groq-api-key',
  mistral: 'mistral-api-key',
  openai: 'openai-api-key',
  openrouter: 'openrouter-api-key',
  cerebras: 'cerebras-api-key',
  opencodezen: 'opencodezen-api-key',
  github: 'github-api-key',
  cloudflare: 'cloudflare-api-key',
  cohere: 'cohere-api-key',
  zai: 'zai-api-key',
  nvidia: 'nvidia-api-key',
  huggingface: 'huggingface-api-key',
  ollama: 'ollama-api-key',
  kilo: 'kilo-api-key',
  pollinations: 'pollinations-api-key',
  llm7: 'llm7-api-key',
  ovh: 'ovh-api-key',
  reka: 'reka-api-key',
  gateway: 'gateway-url',
} as const;

export function isAIModel(model: string | null): model is AIModel {
  return AI_MODELS.includes(model as string);
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

export function getModelRotationStorageKey(sessionId: string | undefined): string {
  return `model-rotation-index-${sessionId || 'new'}`;
}

export function getNextRotatingModel(sessionId: string | undefined): AIModel {
  const storageKey = getModelRotationStorageKey(sessionId);
  const storedIndex = parseInt(localStorage.getItem(storageKey) || '0', 10);
  const currentIndex = isNaN(storedIndex) ? 0 : storedIndex % AI_MODELS.length;
  const nextIndex = (currentIndex + 1) % AI_MODELS.length;

  localStorage.setItem(storageKey, nextIndex.toString());

  return AI_MODELS[currentIndex];
}

export function getModelForChatRequest(sessionId: string | undefined): AIModel {
  return getStoredModelMode() === MODEL_MODES.rotate
    ? getNextRotatingModel(sessionId)
    : getStoredSelectedModel();
}

export function getModelDefinition(modelId: string): ModelDefinition | undefined {
  return MODELS.find(m => m.id === modelId);
}
