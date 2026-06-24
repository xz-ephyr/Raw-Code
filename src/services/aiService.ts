import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createCerebras } from '@ai-sdk/cerebras';
import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import type { OpenAIProvider } from '@ai-sdk/openai';
import { SYSTEM_PROMPT } from './ai/config';
import { API_KEYS, getModelDefinition, getUsedModels, markModelUsed, AI_MODELS, type Provider } from '../config/models';
import { getSmartSystemPrompt } from './ai/contextController';
import { contractContext } from './ai/contextContractor';

let cachedProviders: {
  google: ReturnType<typeof createGoogleGenerativeAI>;
  groq: ReturnType<typeof createGroq>;
  mistral: ReturnType<typeof createMistral>;
  openrouter: OpenAIProvider;
  opencodezen: OpenAIProvider;
  cerebras: ReturnType<typeof createCerebras>;
} | null = null;
let cachedGoogleKey = '';
let cachedGroqKey = '';
let cachedMistralKey = '';
let cachedOpenrouterKey = '';
let cachedOpencodezenKey = '';
let cachedCerebrasKey = '';

export function refreshProviders() {
  cachedProviders = null;
}

function getProviders() {
  const currentGoogleKey = localStorage.getItem(API_KEYS.google) || '';
  const currentGroqKey = localStorage.getItem(API_KEYS.groq) || '';
  const currentMistralKey = localStorage.getItem(API_KEYS.mistral) || '';
  const currentOpenrouterKey = localStorage.getItem(API_KEYS.openrouter) || '';
  const currentOpencodezenKey = localStorage.getItem(API_KEYS.opencodezen) || '';
  const currentCerebrasKey = localStorage.getItem(API_KEYS.cerebras) || '';
  if (
    !cachedProviders ||
    currentGoogleKey !== cachedGoogleKey ||
    currentGroqKey !== cachedGroqKey ||
    currentMistralKey !== cachedMistralKey ||
    currentOpenrouterKey !== cachedOpenrouterKey ||
    currentOpencodezenKey !== cachedOpencodezenKey ||
    currentCerebrasKey !== cachedCerebrasKey
  ) {
    cachedGoogleKey = currentGoogleKey;
    cachedGroqKey = currentGroqKey;
    cachedMistralKey = currentMistralKey;
    cachedOpenrouterKey = currentOpenrouterKey;
    cachedOpencodezenKey = currentOpencodezenKey;
    cachedCerebrasKey = currentCerebrasKey;
    cachedProviders = {
      google: createGoogleGenerativeAI({ apiKey: currentGoogleKey }),
      groq: createGroq({ apiKey: currentGroqKey }),
      mistral: createMistral({ apiKey: currentMistralKey }),
      openrouter: createOpenAI({
        apiKey: currentOpenrouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      }),
      opencodezen: createOpenAI({
        apiKey: currentOpencodezenKey,
        baseURL: localStorage.getItem('opencodezen-base-url') || 'https://opencode.ai/zen/v1',
      }),
      cerebras: createCerebras({ apiKey: currentCerebrasKey }),
    };
  }
  return cachedProviders;
}

export function getAIErrorMessage(error: unknown) {
  if (error == null) return 'The AI request failed for an unknown reason.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return 'The AI request failed and the error could not be serialized.';
  }
}

const MAX_STEPS = 25;

function getConfiguredProviders(): Set<Provider> {
  const configured = new Set<Provider>();
  for (const [provider, key] of Object.entries(API_KEYS)) {
    const val = localStorage.getItem(key);
    if (val && val.trim()) {
      configured.add(provider as Provider);
    }
  }
  return configured;
}

function buildFallbackChain(primaryModelName: string, sessionId?: string): string[] {
  const used = sessionId ? getUsedModels(sessionId) : [];
  const configuredProviders = getConfiguredProviders();
  return [
    primaryModelName,
    ...AI_MODELS.filter(m => {
      if (m === primaryModelName) return false;
      if (used.includes(m)) return false;
      const def = getModelDefinition(m);
      if (!def) return false;
      return configuredProviders.has(def.provider);
    }),
  ];
}

export async function chatCompletion({
  messages,
  modelName,
  isThinkingEnabled,
  abortSignal,
  previousModelName,
  sessionId,
}: {
  messages: any[];
  modelName: string;
  isThinkingEnabled?: boolean;
  abortSignal?: AbortSignal;
  previousModelName?: string;
  sessionId?: string;
}) {
  const providers = getProviders();

  const getLanguageModel = (name: string) => {
    const def = getModelDefinition(name);
    if (!def) return providers.google('gemini-3.5-flash');

    if (def.provider === 'google') return providers.google(def.id);
    if (def.provider === 'groq') return providers.groq(def.id);
    if (def.provider === 'mistral') return providers.mistral(def.id);
    if (def.provider === 'openrouter') return providers.openrouter(def.id);
    if (def.provider === 'opencodezen') return providers.opencodezen(def.id);
    if (def.provider === 'cerebras') return providers.cerebras(def.id);
    return providers.google('gemini-3.5-flash');
  };

  const fullSystemPrompt = getSmartSystemPrompt(SYSTEM_PROMPT);

  const errors: string[] = [];
  const chain = buildFallbackChain(modelName, sessionId);
  const uniqueChain = Array.from(new Set(chain));

  for (let modelIdx = 0; modelIdx < uniqueChain.length; modelIdx++) {
    const currentModelName = uniqueChain[modelIdx];
    const currentModel = getLanguageModel(currentModelName);
    const def = getModelDefinition(currentModelName);
    const shouldApplyThinking = isThinkingEnabled && def?.supportsThinking;

    let providerOptions: any = undefined;
    if (shouldApplyThinking) {
      providerOptions = {};
      if (def?.provider === 'google') {
        providerOptions.google = { thinkingConfig: { thinkingBudget: 1024 } };
      }
    }

    let msgs = messages;

    try {
      if (!msgs || msgs.length === 0) {
        throw new Error('Messages array is empty');
      }

      const hasUIMessages = msgs.some((m: any) => Array.isArray(m.parts));
      if (hasUIMessages) {
        const withParts = msgs.map((m: any) => {
          if (Array.isArray(m.parts)) return { ...m, id: m.id || crypto.randomUUID() };
          return { id: crypto.randomUUID(), role: m.role, parts: [{ type: 'text' as const, text: m.content || '' }] };
        });
        msgs = await convertToModelMessages(withParts, { ignoreIncompleteToolCalls: true });
      } else {
        msgs = msgs
          .filter((m: any) => m.role !== 'system')
          .map((m: any) => ({ role: m.role, content: m.content || '' }));
      }

      if (previousModelName && previousModelName !== currentModelName) {
        const incomingModel = getLanguageModel(currentModelName);
        msgs = await contractContext(msgs, incomingModel);
      }

      const filteredMessages = msgs.filter((m: any) => m.role !== 'system');

      return streamText({
        model: currentModel,
        system: fullSystemPrompt,
        messages: filteredMessages,
        providerOptions,
        abortSignal,
        maxRetries: 2,
        stopWhen: stepCountIs(MAX_STEPS),
        onError({ error }) {
          console.error(`AI stream failed for ${currentModelName}:`, getAIErrorMessage(error));
        },
      });
    } catch (error) {
      if (sessionId) {
        markModelUsed(sessionId, currentModelName);
      }
      errors.push(`${currentModelName}: ${getAIErrorMessage(error)}`);
      console.warn(`Model ${currentModelName} failed, trying fallback...`);
    }
  }

  throw new Error(
    `All AI models failed. Tried: ${uniqueChain.join(', ')}.\nErrors:\n${errors.join('\n')}\n\nCheck your API keys in Settings.`
  );
}
