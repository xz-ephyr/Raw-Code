import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createCerebras } from '@ai-sdk/cerebras';

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

export function getProviderIds(): string[] {
  return Array.from(registry.keys());
}

export function getProviderForModel(modelId: string): KeyProvider | undefined {
  for (const provider of registry.values()) {
    if (provider.modelIdPrefixes.some(prefix => modelId.startsWith(prefix))) {
      return provider;
    }
  }
  return undefined;
}

export function hasProviderAPIKey(providerId: string, keys: Record<string, string>): boolean {
  const key = keys[providerId];
  return !!key && key.trim().length > 0;
}

export function getProviderConfigKey(providerId: string): string | undefined {
  return getProvider(providerId)?.configKey;
}

export function getProviderEnvVar(providerId: string): string | undefined {
  return getProvider(providerId)?.envVar;
}

export function getProviderBaseURL(providerId: string): string | undefined {
  return getProvider(providerId)?.baseURL;
}

export function getProviderLabel(providerId: string): string {
  return getProvider(providerId)?.label ?? providerId;
}

export function getProviderDefaultModel(providerId: string): string | undefined {
  return getProvider(providerId)?.defaultModel;
}

export function getProviderClient(providerId: string, apiKey: string, baseURL?: string): ProviderClient | undefined {
  const provider = getProvider(providerId);
  if (!provider) return undefined;
  return provider.createClient(apiKey, baseURL ?? provider.baseURL);
}

export function getProviderReasoningConfig(providerId: string, modelId: string) {
  return getProvider(providerId)?.getReasoningConfig(modelId) ?? null;
}

const MODEL_REASONING: Record<string, { mode: 'native' | 'tag' | 'none'; tagName?: string; providerOptions?: any }> = {
  'gemini-3.5-flash':       { mode: 'native',  providerOptions: { google: { thinkingConfig: { thinkingBudget: 1024 } } } },
  'gemini-3-flash-preview': { mode: 'native',  providerOptions: { google: { thinkingConfig: { thinkingBudget: 1024 } } } },
  'gemini-2.5-flash':       { mode: 'native',  providerOptions: { google: { thinkingConfig: { thinkingBudget: 1024 } } } },
  'gemini-2.5-flash-lite':  { mode: 'native',  providerOptions: { google: { thinkingConfig: { thinkingBudget: 1024 } } } },
  'groq/compound':                    { mode: 'native', providerOptions: { groq: { reasoningFormat: 'parsed' } } },
  'groq/compound-mini':               { mode: 'native', providerOptions: { groq: { reasoningFormat: 'parsed' } } },
  'openai/gpt-oss-safeguard-20b':     { mode: 'native', providerOptions: { groq: { reasoningFormat: 'parsed' } } },
  'qwen/qwen3-32b':                   { mode: 'tag',    tagName: 'think' },
  'deepseek-v4-flash-free':           { mode: 'tag',    tagName: 'think' },
  'big-pickle':                       { mode: 'tag',    tagName: 'think' },
  'mimo-v2.5-free':                   { mode: 'tag',    tagName: 'think' },
  'magistral-medium-latest':          { mode: 'tag',    tagName: 'think' },
  'nvidia/nemotron-3-ultra-550b-a55b:free':    { mode: 'native', providerOptions: { openrouter: { reasoning: { enabled: true } } } },
  'nvidia/nemotron-3-super-120b-a12b:free':    { mode: 'native', providerOptions: { openrouter: { reasoning: { enabled: true } } } },
  'nvidia/nemotron-3-nano-30b-a3b:free':       { mode: 'native', providerOptions: { openrouter: { reasoning: { enabled: true } } } },
  'openai/gpt-oss-20b:free':                   { mode: 'native', providerOptions: { openrouter: { reasoning: { enabled: true } } } },
  'nvidia/nemotron-nano-12b-v2-vl:free':       { mode: 'native', providerOptions: { openrouter: { reasoning: { enabled: true } } } },
  'nvidia/nemotron-nano-9b-v2:free':           { mode: 'native', providerOptions: { openrouter: { reasoning: { enabled: true } } } },
  'openrouter/free':                           { mode: 'native', providerOptions: { openrouter: { reasoning: { enabled: true } } } },
  'zai-glm-4.7':                   { mode: 'tag',    tagName: 'think' },
  'gpt-oss-120b':                  { mode: 'native', providerOptions: { cerebras: {} } },
};

export function getModelReasoningConfig(modelId: string) {
  return MODEL_REASONING[modelId] ?? null;
}

function makeReasoningGetter(perModel: Record<string, { mode: 'native' | 'tag' | 'none'; tagName?: string; providerOptions?: any }>) {
  return (modelId: string) => perModel[modelId] ?? null;
}

registerProvider({
  id: 'google',
  label: 'Google Gemini',
  configKey: 'api-key',
  envVar: 'API_KEY',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  defaultModel: 'gemini-3.5-flash',
  modelIdPrefixes: ['gemini-', 'gemma-'],
  createClient: (apiKey: string) => createGoogleGenerativeAI({ apiKey }),
  getReasoningConfig: makeReasoningGetter({
    'gemini-3.5-flash':       { mode: 'native',  providerOptions: { google: { thinkingConfig: { thinkingBudget: 1024 } } } },
    'gemini-3-flash-preview': { mode: 'native',  providerOptions: { google: { thinkingConfig: { thinkingBudget: 1024 } } } },
    'gemini-2.5-flash':       { mode: 'native',  providerOptions: { google: { thinkingConfig: { thinkingBudget: 1024 } } } },
    'gemini-2.5-flash-lite':  { mode: 'native',  providerOptions: { google: { thinkingConfig: { thinkingBudget: 1024 } } } },
  }),
});

registerProvider({
  id: 'groq',
  label: 'Groq',
  configKey: 'groq-api-key',
  envVar: 'GROQ_API_KEY',
  baseURL: 'https://api.groq.com/openai/v1',
  defaultModel: 'groq/compound',
  modelIdPrefixes: ['groq/', 'qwen/', 'llama-', 'openai/gpt-oss-'],
  createClient: (apiKey: string) => createGroq({ apiKey }),
  getReasoningConfig: makeReasoningGetter({
    'groq/compound':                    { mode: 'native', providerOptions: { groq: { reasoningFormat: 'parsed' } } },
    'groq/compound-mini':               { mode: 'native', providerOptions: { groq: { reasoningFormat: 'parsed' } } },
    'openai/gpt-oss-safeguard-20b':     { mode: 'native', providerOptions: { groq: { reasoningFormat: 'parsed' } } },
    'qwen/qwen3-32b':                   { mode: 'tag',    tagName: 'think' },
  }),
});

registerProvider({
  id: 'mistral',
  label: 'Mistral',
  configKey: 'mistral-api-key',
  envVar: 'MISTRAL_API_KEY',
  baseURL: 'https://api.mistral.ai/v1',
  defaultModel: 'mistral-large-latest',
  modelIdPrefixes: ['mistral-', 'magistral-', 'devstral-', 'codestral-'],
  createClient: (apiKey: string) => createMistral({ apiKey }),
  getReasoningConfig: makeReasoningGetter({
    'magistral-medium-latest': { mode: 'tag', tagName: 'think' },
  }),
});

registerProvider({
  id: 'openrouter',
  label: 'OpenRouter',
  configKey: 'openrouter-api-key',
  envVar: 'OPENROUTER_API_KEY',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultModel: 'openrouter/free',
  modelIdPrefixes: ['nvidia/', 'openai/gpt-oss-20b', 'poolside/', 'cohere/', 'tencent/', 'openrouter/'],
  createClient: (apiKey: string, baseURL?: string) =>
    createOpenAI({ apiKey, baseURL: baseURL ?? 'https://openrouter.ai/api/v1' }),
  getReasoningConfig: makeReasoningGetter({
    'nvidia/nemotron-3-ultra-550b-a55b:free':    { mode: 'native', providerOptions: { openrouter: { reasoning: { enabled: true } } } },
    'nvidia/nemotron-3-super-120b-a12b:free':    { mode: 'native', providerOptions: { openrouter: { reasoning: { enabled: true } } } },
    'nvidia/nemotron-3-nano-30b-a3b:free':       { mode: 'native', providerOptions: { openrouter: { reasoning: { enabled: true } } } },
    'openai/gpt-oss-20b:free':                   { mode: 'native', providerOptions: { openrouter: { reasoning: { enabled: true } } } },
    'nvidia/nemotron-nano-12b-v2-vl:free':       { mode: 'native', providerOptions: { openrouter: { reasoning: { enabled: true } } } },
    'nvidia/nemotron-nano-9b-v2:free':           { mode: 'native', providerOptions: { openrouter: { reasoning: { enabled: true } } } },
    'openrouter/free':                           { mode: 'native', providerOptions: { openrouter: { reasoning: { enabled: true } } } },
  }),
});

registerProvider({
  id: 'opencodezen',
  label: 'OpenCode Zen',
  configKey: 'opencodezen-api-key',
  envVar: 'MODEL_API_KEY',
  baseURL: 'https://opencode.ai/zen/v1',
  defaultModel: 'deepseek-v4-flash-free',
  modelIdPrefixes: ['deepseek-', 'big-pickle', 'mimo-'],
  createClient: (apiKey: string, baseURL?: string) =>
    createOpenAI({ apiKey, baseURL: baseURL ?? 'https://opencode.ai/zen/v1' }),
  getReasoningConfig: makeReasoningGetter({
    'deepseek-v4-flash-free': { mode: 'tag', tagName: 'think' },
    'big-pickle':             { mode: 'tag', tagName: 'think' },
    'mimo-v2.5-free':         { mode: 'tag', tagName: 'think' },
  }),
});

registerProvider({
  id: 'cerebras',
  label: 'Cerebras',
  configKey: 'cerebras-api-key',
  envVar: 'CEREBRAS_API_KEY',
  baseURL: 'https://api.cerebras.ai/v1',
  defaultModel: 'gpt-oss-120b',
  modelIdPrefixes: ['gpt-oss-', 'zai-', 'gemma-4-31b'],
  createClient: (apiKey: string) => createCerebras({ apiKey }),
  getReasoningConfig: makeReasoningGetter({
    'gpt-oss-120b': { mode: 'native', providerOptions: { cerebras: {} } },
    'zai-glm-4.7':  { mode: 'tag',    tagName: 'think' },
  }),
});
