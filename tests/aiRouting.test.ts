import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { buildFallbackChain } from '../core/models/aiService';
import * as modelsConfig from '../core/config/models';
import { registerProvider } from '../core/providers/providerRegistry';

// Mock getAIModels and getModelDefinition
vi.mock('../core/config/models', async () => {
  const actual = await vi.importActual('../core/config/models');
  return {
    ...actual,
    getAIModels: vi.fn(),
    getModelDefinition: vi.fn(),
    getUsedModels: vi.fn(() => []),
  };
});

describe('buildFallbackChain', () => {
  beforeAll(() => {
    registerProvider({
      id: 'test-alpha',
      label: 'Alpha',
      configKey: 'alpha-api-key',
      envVar: 'ALPHA_API_KEY',
      baseURL: 'https://alpha.test/v1',
      defaultModel: 'test-default',
      modelIdPrefixes: ['alpha/'],
      createClient: (apiKey: string) => ({ apiKey }),
      getReasoningConfig: () => null,
    });
    registerProvider({
      id: 'test-beta',
      label: 'Beta',
      configKey: 'beta-api-key',
      envVar: 'BETA_API_KEY',
      baseURL: 'https://beta.test/v1',
      defaultModel: 'test-default',
      modelIdPrefixes: ['beta/'],
      createClient: (apiKey: string) => ({ apiKey }),
      getReasoningConfig: () => null,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();

    const store: Record<string, string> = {
      'alpha-api-key': 'alpha-key',
      'beta-api-key': 'beta-key',
    };

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
    });
  });

  it('returns single model for auto-prefixed models', async () => {
    const chain = await buildFallbackChain('auto');
    expect(chain).toEqual(['auto']);
  });

  it('prioritizes models with the same supportsThinking status as the primary model', async () => {
    const mockModels = ['primary', 'think1', 'nonthink1', 'think2', 'alpha-nonthink'];
    const modelDefs: Record<string, any> = {
      'primary': { id: 'primary', provider: 'test-beta', supportsThinking: true },
      'think1': { id: 'think1', provider: 'test-alpha', supportsThinking: true },
      'nonthink1': { id: 'nonthink1', provider: 'test-beta', supportsThinking: false },
      'think2': { id: 'think2', provider: 'test-beta', supportsThinking: true },
      'alpha-nonthink': { id: 'alpha-nonthink', provider: 'test-alpha', supportsThinking: false },
    };

    vi.mocked(modelsConfig.getAIModels).mockReturnValue(mockModels);
    vi.mocked(modelsConfig.getModelDefinition).mockImplementation((id: string) => modelDefs[id]);

    const chain = await buildFallbackChain('primary');

    expect(chain[0]).toBe('primary');
    expect(chain.slice(1, 3)).toContain('think1');
    expect(chain.slice(1, 3)).toContain('think2');
  });

  it('limits the fallback chain to 5 additional models (6 total)', async () => {
    const mockModels = ['primary', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'];
    const modelDefs: Record<string, any> = {};
    mockModels.forEach(id => {
      modelDefs[id] = { id, provider: 'test-alpha', supportsThinking: false };
    });

    vi.mocked(modelsConfig.getAIModels).mockReturnValue(mockModels);
    vi.mocked(modelsConfig.getModelDefinition).mockImplementation((id: string) => modelDefs[id]);

    const chain = await buildFallbackChain('primary');

    expect(chain).toHaveLength(6);
    expect(chain[0]).toBe('primary');
  });
});
