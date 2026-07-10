import { createOpenAI } from '@ai-sdk/openai';
import { createCloudflare } from './createCloudflare';

export interface KeyProvider {
  id: string;
  label: string;
  icon: string;
  configKey: string;
  envVar: string;
  baseURL: string;
  defaultModel: string;
  modelIdPrefixes: string[];
  createClient: (apiKey: string, baseURL?: string) => any;
  getReasoningConfig: (modelId: string) => { mode: 'native' | 'tag' | 'none'; tagName?: string; providerOptions?: any } | null;
}

type ProviderClient = any;

const registry = new Map<string, KeyProvider>();

export function registerProvider(provider: KeyProvider): void {
  registry.set(provider.id, provider);
}

export function getProvider(id: string): KeyProvider | undefined {
  return registry.get(id);
}

export function getAllProviders(): KeyProvider[] {
  return Array.from(registry.values());
}

export function getProviderClient(providerId: string, apiKey: string, baseURL?: string): ProviderClient | undefined {
  const provider = getProvider(providerId);
  if (!provider) return undefined;
  return provider.createClient(apiKey, baseURL ?? provider.baseURL);
}

export function getModelReasoningConfig(modelId: string): { mode: 'native' | 'tag' | 'none'; tagName?: string; providerOptions?: any } | null {
  const prefix = modelId.split('/')[0];
  const provider = getProvider(prefix);
  if (provider) {
    return provider.getReasoningConfig(modelId);
  }
  return null;
}

export function getProviderLabel(id: string): string {
  return getProvider(id)?.label ?? id;
}

export function getProviderConfigKey(id: string): string {
  return getProvider(id)?.configKey ?? '';
}

export function getProviderApiKeys(): Record<string, string> {
  const keys: Record<string, string> = {};
  for (const p of getAllProviders()) {
    keys[p.id] = p.configKey;
  }
  return keys;
}

const PROVIDERS: KeyProvider[] = [
  {
    id: 'google',
    label: 'Google AI Studio',
    icon: '/google-color.svg',
    configKey: 'google-api-key',
    envVar: 'GOOGLE_API_KEY',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    modelIdPrefixes: ['gemini'],
    createClient: (apiKey: string, baseURL?: string) =>
      createOpenAI({ apiKey, baseURL: baseURL ?? 'https://generativelanguage.googleapis.com/v1beta/openai' }),
    getReasoningConfig: (modelId) => {
      if (modelId.includes('2.5') || modelId.includes('3.')) return { mode: 'native' };
      return null;
    },
  },
  {
    id: 'groq',
    label: 'Groq',
    icon: '/groq-color.svg',
    configKey: 'groq-api-key',
    envVar: 'GROQ_API_KEY',
    baseURL: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    modelIdPrefixes: ['llama', 'qwen', 'deepseek', 'gpt-oss'],
    createClient: (apiKey: string, baseURL?: string) =>
      createOpenAI({ apiKey, baseURL: baseURL ?? 'https://api.groq.com/openai/v1' }),
    getReasoningConfig: (modelId) => {
      if (modelId.includes('deepseek-r1')) return { mode: 'native' };
      return null;
    },
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    icon: '/cerebras-color.svg',
    configKey: 'cerebras-api-key',
    envVar: 'CEREBRAS_API_KEY',
    baseURL: 'https://api.cerebras.ai/v1',
    defaultModel: 'gpt-oss-120b',
    modelIdPrefixes: ['gpt-oss', 'zai', 'gemma'],
    createClient: (apiKey: string, baseURL?: string) =>
      createOpenAI({ apiKey, baseURL: baseURL ?? 'https://api.cerebras.ai/v1' }),
    getReasoningConfig: () => null,
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    icon: '/mistral-color.svg',
    configKey: 'mistral-api-key',
    envVar: 'MISTRAL_API_KEY',
    baseURL: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-3.2',
    modelIdPrefixes: ['mistral', 'codestral', 'pixtral'],
    createClient: (apiKey: string, baseURL?: string) =>
      createOpenAI({ apiKey, baseURL: baseURL ?? 'https://api.mistral.ai/v1' }),
    getReasoningConfig: (modelId) => {
      if (modelId.includes('medium') || modelId.includes('large')) return { mode: 'native' };
      return null;
    },
  },
  {
    id: 'sambanova',
    label: 'SambaNova',
    icon: '/sambanova-color.svg',
    configKey: 'sambanova-api-key',
    envVar: 'SAMBANOVA_API_KEY',
    baseURL: 'https://api.sambanova.ai/v1',
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
    modelIdPrefixes: ['Meta', 'DeepSeek', 'gpt-oss', 'gemma'],
    createClient: (apiKey: string, baseURL?: string) =>
      createOpenAI({ apiKey, baseURL: baseURL ?? 'https://api.sambanova.ai/v1' }),
    getReasoningConfig: () => null,
  },
  {
    id: 'cohere',
    label: 'Cohere',
    icon: '/commanda-color.svg',
    configKey: 'cohere-api-key',
    envVar: 'COHERE_API_KEY',
    baseURL: 'https://api.cohere.com/compatibility/v1',
    defaultModel: 'command-a-03-2026',
    modelIdPrefixes: ['command', 'c4ai'],
    createClient: (apiKey: string, baseURL?: string) =>
      createOpenAI({ apiKey, baseURL: baseURL ?? 'https://api.cohere.com/compatibility/v1' }),
    getReasoningConfig: (modelId) => {
      if (modelId.includes('command-a')) return { mode: 'native' };
      if (modelId.includes('command-r-plus')) return { mode: 'native' };
      return null;
    },
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    icon: '/huggingface-color.svg',
    configKey: 'huggingface-api-key',
    envVar: 'HUGGINGFACE_API_KEY',
    baseURL: 'https://api-inference.huggingface.co/v1',
    defaultModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    modelIdPrefixes: ['meta-llama', 'Qwen', 'google'],
    createClient: (apiKey: string, baseURL?: string) =>
      createOpenAI({ apiKey, baseURL: baseURL ?? 'https://api-inference.huggingface.co/v1' }),
    getReasoningConfig: () => null,
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare AI',
    icon: '/cloudflare-color.svg',
    configKey: 'cloudflare-api-key',
    envVar: 'CLOUDFLARE_API_KEY',
    baseURL: 'https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1',
    defaultModel: '@cf/meta/llama-3.1-8b-instruct',
    modelIdPrefixes: ['@cf', '@hf'],
    createClient: (apiKey: string, baseURL?: string) => {
      const accountId = baseURL?.match(/accounts\/([^/]+)/)?.[1] || '';
      return createCloudflare(apiKey, accountId);
    },
    getReasoningConfig: () => null,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    icon: '/deepseek-color.svg',
    configKey: 'deepseek-api-key',
    envVar: 'DEEPSEEK_API_KEY',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    modelIdPrefixes: ['deepseek'],
    createClient: (apiKey: string, baseURL?: string) =>
      createOpenAI({ apiKey, baseURL: baseURL ?? 'https://api.deepseek.com/v1' }),
    getReasoningConfig: (modelId) => {
      if (modelId.includes('reasoner')) return { mode: 'native' };
      return null;
    },
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    icon: '/nvidia-color.svg',
    configKey: 'nvidia-api-key',
    envVar: 'NVIDIA_API_KEY',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'nvidia/llama-3.3-nemotron-super-49b-v1',
    modelIdPrefixes: ['nvidia', 'meta', 'mistralai', 'google'],
    createClient: (apiKey: string, baseURL?: string) =>
      createOpenAI({ apiKey, baseURL: baseURL ?? 'https://integrate.api.nvidia.com/v1' }),
    getReasoningConfig: (modelId) => {
      if (modelId.includes('mistral-large')) return { mode: 'native' };
      return null;
    },
  },
];

for (const p of PROVIDERS) {
  registerProvider(p);
}
