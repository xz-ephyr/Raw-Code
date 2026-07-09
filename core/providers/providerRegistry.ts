import { createOpenAI } from '@ai-sdk/openai';

export interface KeyProvider {
  id: string;
  label: string;
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

const MODEL_REASONING: Record<string, { mode: 'native' | 'tag' | 'none'; tagName?: string; providerOptions?: any }> = {
  'z-ai/glm-4.7-flash-free':     { mode: 'tag', tagName: 'think' },
  'z-ai/glm-4.6v-flash-free':     { mode: 'tag', tagName: 'think' },
  'deepseek/deepseek-v3.2':       { mode: 'tag', tagName: 'think' },
  'deepseek/deepseek-reasoner':   { mode: 'tag', tagName: 'think' },
  'deepseek/deepseek-chat':       { mode: 'native' },
  'qwen/qwen3-coder-plus':        { mode: 'none' },
  'anthropic/claude-fable-5-free': { mode: 'tag', tagName: 'think' },
};

export function getModelReasoningConfig(modelId: string) {
  return MODEL_REASONING[modelId] ?? null;
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

function makeReasoningGetter(perModel: Record<string, { mode: 'native' | 'tag' | 'none'; tagName?: string; providerOptions?: any }>) {
  return (modelId: string) => perModel[modelId] ?? null;
}

registerProvider({
  id: 'zenmux',
  label: 'ZenMux',
  configKey: 'zenmux-api-key',
  envVar: 'ZENMUX_API_KEY',
  baseURL: 'https://zenmux.ai/api/v1',
  defaultModel: 'z-ai/glm-4.7-flash-free',
  modelIdPrefixes: ['deepseek/', 'stepfun/', 'xiaomi/', 'z-ai/', 'anthropic/', 'openai/', 'google/', 'qwen/', 'x-ai/', 'moonshotai/', 'minimax/', 'mistralai/', 'bytedance/', 'inclusionai/'],
  createClient: (apiKey: string, baseURL?: string) =>
    createOpenAI({ apiKey, baseURL: baseURL ?? 'https://zenmux.ai/api/v1' }),
  getReasoningConfig: makeReasoningGetter({
    'z-ai/glm-4.7-flash-free':     { mode: 'tag', tagName: 'think' },
    'z-ai/glm-4.6v-flash-free':     { mode: 'tag', tagName: 'think' },
    'deepseek/deepseek-v3.2':       { mode: 'tag', tagName: 'think' },
    'deepseek/deepseek-reasoner':   { mode: 'tag', tagName: 'think' },
    'deepseek/deepseek-chat':       { mode: 'native' },
    'qwen/qwen3-coder-plus':        { mode: 'none' },
    'anthropic/claude-fable-5-free': { mode: 'tag', tagName: 'think' },
  }),
});
