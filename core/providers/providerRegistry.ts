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

registerProvider({
  id: 'omniroute',
  label: 'OmniRoute',
  configKey: 'omniroute-api-key',
  envVar: 'OMNIROUTE_API_KEY',
  baseURL: 'http://localhost:20128/v1',
  defaultModel: 'auto',
  modelIdPrefixes: ['auto', 'auto/', 'cc/', 'cx/', 'openai/', 'anthropic/', 'google/', 'gemini/', 'deepseek/', 'qwen/', 'x-ai/', 'mistralai/', 'groq/', 'claude/', 'gpt/'],
  createClient: (apiKey: string, baseURL?: string) =>
    createOpenAI({ apiKey, baseURL: baseURL ?? 'http://localhost:20128/v1' }),
  getReasoningConfig: () => ({ mode: 'native' }),
});
