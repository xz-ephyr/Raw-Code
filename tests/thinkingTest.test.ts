import { describe, it } from 'vitest';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, wrapLanguageModel, extractReasoningMiddleware } from 'ai';
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

describe('Thinking/Reasoning models', () => {
  for (const model of thinkingModels) {
    const envVar = ENVS[model.provider];
    const apiKey = envVar ? process.env[envVar] : undefined;

    (apiKey ? describe : describe.skip)(`${model.provider}/${model.id}`, () => {
      const baseURL = BASES[model.provider];
      if (!baseURL) return;

      it('responds without thinking enabled', { timeout: 30000 }, async () => {
        const chat = createOpenAI({ apiKey, baseURL }).chat(model.id);
        const result = await generateText({ model: chat, prompt: 'Say exactly: OK', maxRetries: 0 });
        console.log(`  no-thinking -> ${result.text.slice(0, 100)}`);
        if (result.reasoning && (Array.isArray(result.reasoning) ? result.reasoning.length : result.reasoning)) {
          console.log(`  reasoning: ${JSON.stringify(result.reasoning).slice(0, 200)}`);
        }
      });

      it('responds with native thinking enabled', { timeout: 30000 }, async () => {
        const chat = createOpenAI({ apiKey, baseURL }).chat(model.id);
        try {
          const result = await generateText({
            model: chat,
            prompt: 'What is 2+2? Think step by step.',
            maxRetries: 0,
          });
          console.log(`  native-thinking -> ${result.text.slice(0, 200)}`);
          if (result.reasoning && (Array.isArray(result.reasoning) ? result.reasoning.length : result.reasoning)) {
            console.log(`  reasoning: ${Array.isArray(result.reasoning) ? result.reasoning[0]?.slice(0, 200) : JSON.stringify(result.reasoning).slice(0, 200)}`);
          }
          const tagConfig = TAG_CONFIGS[model.id];
          if (tagConfig) {
            const tagMatch = result.text.match(new RegExp(`<${tagConfig.tagName}>([\\s\\S]*?)<\\/${tagConfig.tagName}>`));
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
        it('extracts reasoning via wrapLanguageModel + extractReasoningMiddleware', { timeout: 30000 }, async () => {
          const rawChat = createOpenAI({ apiKey, baseURL }).chat(model.id);
          const wrapped = wrapLanguageModel({
            model: rawChat,
            middleware: extractReasoningMiddleware({ tagName: tagConfig.tagName }),
          });
          const result = await generateText({
            model: wrapped,
            prompt: 'What is 2+2? Think step by step.',
            maxRetries: 0,
          });
          console.log(`  wrapped thinking -> ${result.text.slice(0, 100)}`);
          const reasoningParts = result.reasoning as any[];
          console.log(`  reasoning array length: ${reasoningParts?.length ?? 'none'}`);
          if (reasoningParts?.length) {
            const first = reasoningParts[0];
            const text = typeof first === 'string' ? first : first.text || JSON.stringify(first);
            console.log(`  first reasoning part: ${(text as string).slice(0, 200)}`);
          }
        });
      }
    });
  }
});
