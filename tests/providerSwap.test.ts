import { describe, it, expect, vi } from 'vitest';

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

import { registerProvider, getProvider, getAllProviders, getProviderApiKeys, getProviderLabel } from '../core/providers/providerRegistry';

describe('Pluggable Key Providers', () => {
  it('should have providers registered by default', () => {
    const ids = getAllProviders().map(p => p.id);
    expect(ids.length).toBeGreaterThan(0);
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
    expect(getProviderLabel('nonexistent')).toBe('nonexistent');

    const apiKeys = getProviderApiKeys();
    expect(Object.keys(apiKeys).length).toBeGreaterThan(0);
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
