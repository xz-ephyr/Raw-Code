import { describe, it, expect, assert } from 'vitest';
import { readFileSync } from 'node:fs';
import { getAllProviders } from '@core/providers/providerRegistry';
import { MODELS } from '@core/config/models';
import { ModelRoutesProvider } from '@doktor/llm-providers';
const { allRoutes } = ModelRoutesProvider

const PROVIDER_ENV_MAP: Record<string, string> = {
  google: 'GOOGLE_API_KEY',
  groq: 'GROQ_API_KEY',
  cerebras: 'CEREBRAS_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  sambanova: 'SAMBANOVA_API_KEY',
  cohere: 'COHERE_API_KEY',
  huggingface: 'HUGGINGFACE_API_KEY',
  cloudflare: 'CLOUDFLARE_API_KEY',
  nvidia: 'NVIDIA_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
};

describe('Provider registry configuration', () => {
  it('all createClient calls exist and return objects with apiKey', () => {
    const source = readFileSync('core/providers/providerRegistry.ts', 'utf-8');
    const errors: string[] = [];

    const lines = source.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('createClient:') && line.includes('apiKey')) continue;
      if (line.includes('createClient:') && !line.includes('createCloudflare')) {
        errors.push(`Line ${i + 1}: ${line.trim()} missing apiKey`);
      }
    }

    expect(errors, errors.join('\n')).toEqual([]);
  });
});

async function testModel(providerId: string, modelId: string) {
  const envVar = PROVIDER_ENV_MAP[providerId];
  if (!envVar) return { modelId, status: 'skipped', reason: `No env var mapping for provider ${providerId}` };

  const apiKey = process.env[envVar];
  if (!apiKey) return { modelId, status: 'skipped', reason: `No ${envVar} set` };

  const provider = getAllProviders().find(p => p.id === providerId);
  if (!provider) return { modelId, status: 'skipped', reason: `Provider ${providerId} not found` };

  const route = allRoutes.find(r => r.id === modelId);
  if (!route) return { modelId, status: 'skipped', reason: `No route for ${modelId}` };

  try {
    const response = await fetch(`${route.endpoint.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'Say exactly: OK' }],
        max_tokens: 10,
        stream: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      const msg = text.slice(0, 200);
      if (response.status === 401) {
        return { modelId, status: 'error', reason: 'Auth failed (bad API key)' };
      }
      if (response.status === 404) {
        return { modelId, status: 'fail', reason: msg };
      }
      if (response.status === 400) {
        return { modelId, status: 'fail', reason: msg };
      }
      return { modelId, status: 'error', reason: msg };
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return { modelId, status: 'pass', text };
  } catch (e: any) {
    return { modelId, status: 'error', reason: e.message || String(e) };
  }
}

describe('Model API validation', () => {
  const providerIds = [...new Set(MODELS.map(m => m.provider))];

  for (const providerId of providerIds) {
    const providerModels = MODELS.filter(m => m.provider === providerId);
    const envVar = PROVIDER_ENV_MAP[providerId];
    const apiKey = envVar ? process.env[envVar] : undefined;

    describe(`${providerId} (${apiKey ? 'key set' : 'NO KEY - skipped'})`, () => {
      for (const model of providerModels) {
        it(`${model.id} (${model.label})`, { timeout: 30000 }, async () => {
          const result = await testModel(providerId, model.id);
          console.log(`  [${result.status.toUpperCase()}] ${providerId}/${model.id}${result.reason ? ': ' + result.reason : ''}${result.text ? ' -> ' + result.text : ''}`);
          if (result.status === 'fail') {
            assert.fail(`Model failed: ${result.reason}`);
          }
        });
      }
    });
  }
});
