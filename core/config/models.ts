export type Provider = string;

export interface ModelDefinition {
  id: string;
  provider: Provider;
  label: string;
  supportsThinking?: boolean;
  cliId?: string;
}

export const MODELS: ModelDefinition[] = [
  // Google AI Studio
  { id: 'gemini-2.5-flash', provider: 'google', label: 'Gemini 2.5 Flash', supportsThinking: false },
  { id: 'gemini-3-flash-preview', provider: 'google', label: 'Gemini 3 Flash', supportsThinking: false },
  { id: 'gemini-3.1-flash-lite-preview', provider: 'google', label: 'Gemini 3.1 Flash Lite', supportsThinking: false },
  { id: 'gemma-4-31b-it', provider: 'google', label: 'Gemma 4 31B', supportsThinking: false },
  { id: 'gemma-4-26b-a4b-it', provider: 'google', label: 'Gemma 4 26B', supportsThinking: false },

  // Groq
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', provider: 'groq', label: 'Llama 4 Scout', supportsThinking: false },
  { id: 'llama-3.3-70b-versatile', provider: 'groq', label: 'Llama 3.3 70B', supportsThinking: false },
  { id: 'qwen/qwen3-32b', provider: 'groq', label: 'Qwen3 32B', supportsThinking: false },
  { id: 'qwen/qwen3.6-27b', provider: 'groq', label: 'Qwen3.6 27B', supportsThinking: false },
  { id: 'openai/gpt-oss-120b', provider: 'groq', label: 'GPT-OSS 120B', supportsThinking: false },

  // Cerebras
  { id: 'cerebras/gpt-oss-120b', provider: 'cerebras', label: 'GPT-OSS 120B', supportsThinking: false },
  { id: 'zai-glm-4.7', provider: 'cerebras', label: 'Z.ai GLM 4.7', supportsThinking: false },
  { id: 'gemma-4-31b', provider: 'cerebras', label: 'Gemma 4 31B', supportsThinking: false },

  // Mistral AI
  { id: 'mistral-small-latest', provider: 'mistral', label: 'Mistral Small 4', supportsThinking: false },
  { id: 'mistral-medium-3.5', provider: 'mistral', label: 'Mistral Medium 3.5', supportsThinking: false },
  { id: 'mistral-large-latest', provider: 'mistral', label: 'Mistral Large 3', supportsThinking: false },
  { id: 'codestral-latest', provider: 'mistral', label: 'Codestral', supportsThinking: false },
  { id: 'pixtral-12b', provider: 'mistral', label: 'Pixtral 12B', supportsThinking: false },

  // SambaNova
  { id: 'Meta-Llama-3.3-70B-Instruct', provider: 'sambanova', label: 'Llama 3.3 70B', supportsThinking: false },
  { id: 'DeepSeek-V3.1', provider: 'sambanova', label: 'DeepSeek V3.1', supportsThinking: false },
  { id: 'sambanova/gpt-oss-120b', provider: 'sambanova', label: 'GPT-OSS 120B', supportsThinking: false },
  { id: 'DeepSeek-V3.2', provider: 'sambanova', label: 'DeepSeek V3.2', supportsThinking: false },
  { id: 'gemma-4-31B-it', provider: 'sambanova', label: 'Gemma 4 31B', supportsThinking: false },

  // Cohere
  { id: 'command-a-03-2026', provider: 'cohere', label: 'Command A', supportsThinking: false },
  { id: 'command-a-plus', provider: 'cohere', label: 'Command A+', supportsThinking: false },
  { id: 'command-r-plus-08-2024', provider: 'cohere', label: 'Command R+', supportsThinking: false },
  { id: 'command-r-08-2024', provider: 'cohere', label: 'Command R', supportsThinking: false },
  { id: 'command-r7b-12-2024', provider: 'cohere', label: 'Command R7B', supportsThinking: false },
  { id: 'c4ai-aya-expanse-32b', provider: 'cohere', label: 'Aya Expanse 32B', supportsThinking: false },

  // Hugging Face
  { id: 'meta-llama/Llama-3.2-11B-Vision-Instruct', provider: 'huggingface', label: 'Llama 3.2 11B Vision', supportsThinking: false },
  { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', provider: 'huggingface', label: 'Llama 3.1 8B', supportsThinking: false },
  { id: 'Qwen/Qwen2.5-72B-Instruct', provider: 'huggingface', label: 'Qwen2.5 72B', supportsThinking: false },
  { id: 'google/gemma-2-9b-it', provider: 'huggingface', label: 'Gemma 2 9B', supportsThinking: false },

  // Cloudflare Workers AI
  { id: '@cf/meta/llama-3.1-8b-instruct', provider: 'cloudflare', label: 'Llama 3.1 8B', supportsThinking: false },
  { id: '@cf/meta/llama-3.2-3b-instruct', provider: 'cloudflare', label: 'Llama 3.2 3B', supportsThinking: false },
  { id: '@cf/qwen/qwen1.5-7b-chat-awq', provider: 'cloudflare', label: 'Qwen1.5 7B', supportsThinking: false },
  { id: '@cf/microsoft/phi-2', provider: 'cloudflare', label: 'Phi-2', supportsThinking: false },

  // NVIDIA NIM
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1', provider: 'nvidia', label: 'Nemotron Super 49B', supportsThinking: false },
  { id: 'nvidia/nemotron-3-nano-30b-a3b', provider: 'nvidia', label: 'Nemotron 3 Nano 30B', supportsThinking: false },
  { id: 'meta/llama-3.1-8b-instruct', provider: 'nvidia', label: 'Llama 3.1 8B', supportsThinking: false },
  { id: 'mistralai/mistral-large-3-675b-instruct-2512', provider: 'nvidia', label: 'Mistral Large 3', supportsThinking: false },

  // DeepSeek
  { id: 'deepseek-chat', provider: 'deepseek', label: 'DeepSeek V4-Flash', supportsThinking: false },
  { id: 'deepseek-reasoner', provider: 'deepseek', label: 'DeepSeek R1', supportsThinking: false },
  { id: 'deepseek-coder', provider: 'deepseek', label: 'DeepSeek Coder', supportsThinking: false },
];

const CLI_MODELS: ModelDefinition[] = [];

function getAIModels(): string[] {
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

export function getModelForChatRequest(_sessionId: string | undefined, _projectId?: string): AIModel {
  return getStoredSelectedModel();
}

export function getModelDefinition(modelId: string): ModelDefinition | undefined {
  return MODELS.find(m => m.id === modelId) || CLI_MODELS.find(m => m.id === modelId);
}
