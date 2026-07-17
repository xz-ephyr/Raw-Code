import { describe, it } from 'vitest';
import { MODELS } from '@core/config/models';

const ENVS: Record<string, string> = {
  google: 'GOOGLE_API_KEY',
  groq: 'GROQ_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  nvidia: 'NVIDIA_API_KEY',
  cohere: 'COHERE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
};

const BASES: Record<string, string> = {
  google: 'https://generativelanguage.googleapis.com/v1beta/openai',
  groq: 'https://api.groq.com/openai/v1',
  mistral: 'https://api.mistral.ai/v1',
  nvidia: 'https://integrate.api.nvidia.com/v1',
  cohere: 'https://api.cohere.com/compatibility/v1',
  deepseek: 'https://api.deepseek.com/v1',
};

const TAG_CONFIGS: Record<string, { tagName: string }> = {
  'gemma-4-31b-it': { tagName: 'thought' },
  'gemma-4-26b-a4b-it': { tagName: 'thought' },
  'deepseek-reasoner': { tagName: 'think' },
};

const thinkingModels = MODELS.filter(m => m.supportsThinking);

async function postCompletion(baseURL: string, apiKey: string, modelId: string, messages: any[]) {
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: modelId, messages, max_tokens: 200 }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${text.slice(0, 200)}`);
  }
  return response.json() as any;
}

describe('Thinking/Reasoning models', () => {
  for (const model of thinkingModels) {
    const envVar = ENVS[model.provider];
    const apiKey = envVar ? process.env[envVar] : undefined;

    (apiKey ? describe : describe.skip)(`${model.provider}/${model.id}`, () => {
      const baseURL = BASES[model.provider];
      if (!baseURL) return;

      it('responds without thinking enabled', { timeout: 60000 }, async () => {
        try {
          const data = await postCompletion(baseURL, apiKey!, model.id, [
            { role: 'user', content: 'Say exactly: OK' },
          ]);
          const text = data?.choices?.[0]?.message?.content || '';
          console.log(`  no-thinking -> ${text.slice(0, 100)}`);
        } catch (e: any) {
          console.log(`  no-thinking ERROR: ${(e.message || String(e)).slice(0, 200)}`);
        }
      });

      it('responds with native thinking enabled', { timeout: 60000 }, async () => {
        try {
          const data = await postCompletion(baseURL, apiKey!, model.id, [
            { role: 'user', content: 'What is 2+2? Think step by step.' },
          ]);
          const text = data?.choices?.[0]?.message?.content || '';
          console.log(`  native-thinking -> ${text.slice(0, 200)}`);
          const tagConfig = TAG_CONFIGS[model.id];
          if (tagConfig) {
            const tagMatch = text.match(new RegExp(`<${tagConfig.tagName}>([\\s\\S]*?)<\\/${tagConfig.tagName}>`));
            if (tagMatch) {
              console.log(`  <${tagConfig.tagName}> tag content: ${tagMatch[1].slice(0, 100)}`);
            }
          }
        } catch (e: any) {
          console.log(`  native-thinking ERROR: ${(e.message || String(e)).slice(0, 200)}`);
        }
      });

      const tagConfig = TAG_CONFIGS[model.id];
      if (tagConfig) {
        it('extracts reasoning via tag regex', { timeout: 60000 }, async () => {
          try {
            const data = await postCompletion(baseURL, apiKey!, model.id, [
              { role: 'user', content: 'What is 2+2? Think step by step.' },
            ]);
            const text = data?.choices?.[0]?.message?.content || '';
            const tagMatch = text.match(new RegExp(`<${tagConfig.tagName}>([\\s\\S]*?)<\\/${tagConfig.tagName}>`));
            if (tagMatch) {
              console.log(`  extracted reasoning: ${tagMatch[1].slice(0, 200)}`);
              const withoutTag = text.replace(new RegExp(`<${tagConfig.tagName}>[\\s\\S]*?<\\/${tagConfig.tagName}>`), '').trim();
              console.log(`  cleaned text: ${withoutTag.slice(0, 100)}`);
            } else {
              console.log(`  no <${tagConfig.tagName}> tag found`);
            }
          } catch (e: any) {
            console.log(`  tag extraction ERROR: ${(e.message || String(e)).slice(0, 200)}`);
          }
        });
      }
    });
  }
});
