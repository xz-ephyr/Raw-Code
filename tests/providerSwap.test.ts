import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../core/utils/DatabaseService', () => {
  const store = new Map<string, string>();
  return {
    DatabaseService: {
      getConfig: vi.fn(async (key: string) => store.get(key) ?? null),
      setConfig: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
      getProjectMemory: vi.fn(async () => []),
      setProjectMemory: vi.fn(async () => {}),
      deleteProjectMemory: vi.fn(async () => {}),
      clearProjectMemory: vi.fn(async () => {}),
      __reset: () => store.clear(),
    },
  };
});

import { registerProvider, getProvider, getAllProviders, getProviderClient, getProviderApiKeys, getProviderLabel } from '../core/providers/providerRegistry';

beforeEach(() => {
  // Clear and re-register defaults by re-importing
});

describe('Pluggable Key Providers', () => {
  it('should return default providers from registry', () => {
    const providers = getAllProviders();
    expect(providers.length).toBeGreaterThanOrEqual(6);
    const ids = providers.map(p => p.id);
    expect(ids).toContain('google');
    expect(ids).toContain('groq');
    expect(ids).toContain('zenmux');
    expect(ids).toContain('mistral');
    expect(ids).toContain('openrouter');
    expect(ids).toContain('cerebras');
  });

  it('should allow registering a new custom provider', () => {
    registerProvider({
      id: 'custom-provider',
      label: 'Custom AI',
      configKey: 'custom-api-key',
      envVar: 'CUSTOM_API_KEY',
      baseURL: 'https://custom.ai/v1',
      defaultModel: 'custom-model',
      modelIdPrefixes: ['custom-'],
      createClient: (apiKey: string) => ({ apiKey }),
      getReasoningConfig: () => null,
    });

    const provider = getProvider('custom-provider');
    expect(provider).toBeDefined();
    expect(provider!.label).toBe('Custom AI');
    expect(provider!.baseURL).toBe('https://custom.ai/v1');
  });

  it('should return label and config key helpers', () => {
    expect(getProviderLabel('google')).toBe('Google Gemini');
    expect(getProviderLabel('nonexistent')).toBe('nonexistent');

    const apiKeys = getProviderApiKeys();
    expect(apiKeys['google']).toBe('api-key');
    expect(apiKeys['groq']).toBe('groq-api-key');
    expect(apiKeys['zenmux']).toBe('zenmux-api-key');
  });

  it('should resolve model prefixes correctly via provider registry', () => {
    const providers = getAllProviders();

    for (const p of providers) {
      expect(p.modelIdPrefixes.length).toBeGreaterThan(0);
      for (const prefix of p.modelIdPrefixes) {
        expect(typeof prefix).toBe('string');
        expect(prefix.length).toBeGreaterThan(0);
      }
    }
  });
});