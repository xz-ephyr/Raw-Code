import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildFallbackChain } from '../src/services/aiService';
import * as modelsConfig from '../src/config/models';

// Mock getAIModels and getModelDefinition
vi.mock('../src/config/models', async () => {
  const actual = await vi.importActual('../src/config/models');
  return {
    ...actual,
    getAIModels: vi.fn(),
    getModelDefinition: vi.fn(),
    getUsedModels: vi.fn(() => []),
  };
});

describe('buildFallbackChain', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage
    const store: Record<string, string> = {
      'api-key': 'google-key',
      'groq-api-key': 'groq-key',
      'mistral-api-key': 'mistral-key',
      'cerebras-api-key': 'cerebras-key',
    };

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
    });
  });

  it('prioritizes models with the same supportsThinking status as the primary model', () => {
    const mockModels = ['primary', 'think1', 'nonthink1', 'think2', 'google-nonthink'];
    const modelDefs: Record<string, any> = {
      'primary': { id: 'primary', provider: 'groq', supportsThinking: true },
      'think1': { id: 'think1', provider: 'mistral', supportsThinking: true },
      'nonthink1': { id: 'nonthink1', provider: 'groq', supportsThinking: false },
      'think2': { id: 'think2', provider: 'cerebras', supportsThinking: true },
      'google-nonthink': { id: 'google-nonthink', provider: 'google', supportsThinking: false },
    };

    vi.mocked(modelsConfig.getAIModels).mockReturnValue(mockModels);
    vi.mocked(modelsConfig.getModelDefinition).mockImplementation((id: string) => modelDefs[id]);

    const chain = buildFallbackChain('primary');

    // Expected order:
    // 1. primary (always first)
    // 2. think1 or think2 (both are thinking models like primary)
    // 3. google-nonthink (google provider prioritized after thinking match)
    // 4. nonthink1

    expect(chain[0]).toBe('primary');
    expect(chain.slice(1, 3)).toContain('think1');
    expect(chain.slice(1, 3)).toContain('think2');
    expect(chain[3]).toBe('google-nonthink');
    expect(chain[4]).toBe('nonthink1');
  });

  it('prioritizes google provider models when other criteria are equal', () => {
    const mockModels = ['primary', 'google-model', 'other-model'];
    const modelDefs: Record<string, any> = {
      'primary': { id: 'primary', provider: 'mistral', supportsThinking: false },
      'google-model': { id: 'google-model', provider: 'google', supportsThinking: false },
      'other-model': { id: 'other-model', provider: 'groq', supportsThinking: false },
    };

    vi.mocked(modelsConfig.getAIModels).mockReturnValue(mockModels);
    vi.mocked(modelsConfig.getModelDefinition).mockImplementation((id: string) => modelDefs[id]);

    const chain = buildFallbackChain('primary');

    expect(chain[0]).toBe('primary');
    expect(chain[1]).toBe('google-model');
    expect(chain[2]).toBe('other-model');
  });

  it('limits the fallback chain to 5 additional models (6 total)', () => {
    const mockModels = ['primary', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'];
    const modelDefs: Record<string, any> = {};
    mockModels.forEach(id => {
      modelDefs[id] = { id, provider: 'google', supportsThinking: false };
    });

    vi.mocked(modelsConfig.getAIModels).mockReturnValue(mockModels);
    vi.mocked(modelsConfig.getModelDefinition).mockImplementation((id: string) => modelDefs[id]);

    const chain = buildFallbackChain('primary');

    expect(chain).toHaveLength(6);
    expect(chain[0]).toBe('primary');
  });
});
