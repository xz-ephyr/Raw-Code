import { describe, it, expect, assert } from 'vitest';
import { generateText } from 'ai';
import { readFileSync } from 'node:fs';
import { getAllProviders, getProviderClient } from '@core/providers/providerRegistry';
import { MODELS } from '@core/config/models';

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
  it('all createOpenAI calls use .chat (not Responses API)', () => {
    const source = readFileSync('core/providers/providerRegistry.ts', 'utf-8');
    const errors: string[] = [];

    const lines = source.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('createOpenAI(') && !line.includes('createCloudflare')) {
        const after = lines.slice(i, i + 3).join('');
        if (!after.includes('.chat')) {
          errors.push(`Line ${i + 1}: ${line.trim()} missing .chat`);
        }
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

  if (providerId === 'cloudflare') {
    return { modelId, status: 'skipped', reason: 'Cloudflare custom provider uses spec v1, SDK v6 requires v2' };
  }

  let modelClient;
  try {
    modelClient = getProviderClient(providerId, apiKey);
  } catch (e: any) {
    return { modelId, status: 'error', reason: `Client creation failed: ${e.message}` };
  }
  if (!modelClient) return { modelId, status: 'error', reason: 'Client not created' };

  let model;
  try {
    model = modelClient(modelId);
  } catch (e: any) {
    return { modelId, status: 'error', reason: `Model creation failed: ${e.message}` };
  }

  try {
    const result = await generateText({
      model,
      prompt: 'Say exactly: OK',
      maxRetries: 0,
    });
    return { modelId, status: 'pass', text: result.text };
  } catch (e: any) {
    const msg = e.message || String(e);
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('Unauthorized') || msg.includes('auth')) {
      return { modelId, status: 'error', reason: 'Auth failed (bad API key)' };
    }
    if (msg.includes('404') || msg.includes('Not Found') || msg.includes('not found') || msg.includes('decommissioned') || msg.includes('deprecated')) {
      return { modelId, status: 'fail', reason: msg };
    }
    if (msg.includes('400') || msg.includes('Bad Request') || msg.includes('unsupported') || msg.includes('not supported')) {
      return { modelId, status: 'fail', reason: msg };
    }
    return { modelId, status: 'error', reason: msg };
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
