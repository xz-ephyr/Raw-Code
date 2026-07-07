import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createCerebras } from '@ai-sdk/cerebras';
import { streamText, generateText, stepCountIs, convertToModelMessages, tool, zodSchema } from 'ai';
import type { OpenAIProvider } from '@ai-sdk/openai';
import { SYSTEM_PROMPT } from '@core/prompt/systemPrompt';
import { writeArtifactTool } from '@core/tools/writeArtifactTool';
import { allTools } from '@core/tools/allTools';
import { API_KEYS, getModelDefinition, getUsedModels, markModelUsed, getAIModels, getStoredSelectedModel, type Provider } from '@core/config/models';
import { DatabaseService } from '@core/utils/DatabaseService';
import { getModeSystemPrompt } from '@core/mode';
import { getSmartSystemPrompt, type ProjectContext } from '@core/memory/contextController';
import { contractContext } from '@core/memory/contextContractor';

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

async function getProviders() {
  const [
    currentGoogleKey,
    currentGroqKey,
    currentMistralKey,
    currentOpenrouterKey,
    currentOpencodezenKey,
    currentCerebrasKey,
  ] = await Promise.all([
    DatabaseService.getConfig(API_KEYS.google).then(r => r || localStorage.getItem(API_KEYS.google) || ''),
    DatabaseService.getConfig(API_KEYS.groq).then(r => r || localStorage.getItem(API_KEYS.groq) || ''),
    DatabaseService.getConfig(API_KEYS.mistral).then(r => r || localStorage.getItem(API_KEYS.mistral) || ''),
    DatabaseService.getConfig(API_KEYS.openrouter).then(r => r || localStorage.getItem(API_KEYS.openrouter) || ''),
    DatabaseService.getConfig(API_KEYS.opencodezen).then(r => r || localStorage.getItem(API_KEYS.opencodezen) || ''),
    DatabaseService.getConfig(API_KEYS.cerebras).then(r => r || localStorage.getItem(API_KEYS.cerebras) || ''),
  ]);

  const opencodezenBaseURL = await DatabaseService.getConfig('opencodezen-base-url')
    .then(r => r || localStorage.getItem('opencodezen-base-url') || 'https://opencode.ai/zen/v1');

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
        baseURL: opencodezenBaseURL,
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

const MAX_STEPS = 20;

async function getConfiguredProviders(): Promise<Set<Provider>> {
  const configured = new Set<Provider>();
  for (const [provider, key] of Object.entries(API_KEYS)) {
    const val = await DatabaseService.getConfig(key)
      .then(r => r || localStorage.getItem(key) || '');
    if (val && val.trim()) {
      configured.add(provider as Provider);
    }
  }
  return configured;
}

export async function buildFallbackChain(primaryModelName: string, sessionId?: string): Promise<string[]> {
  const used = sessionId ? getUsedModels(sessionId) : [];
  const configuredProviders = await getConfiguredProviders();
  const primaryDef = getModelDefinition(primaryModelName);

  const others = getAIModels()
    .filter((m: string) => {
      if (m === primaryModelName) return false;
      if (used.includes(m)) return false;
      const def = getModelDefinition(m);
      if (!def) return false;
      return configuredProviders.has(def.provider);
    })
    .sort((a, b) => {
      const defA = getModelDefinition(a)!;
      const defB = getModelDefinition(b)!;

      // 1. Prioritize models with the same 'supportsThinking' status as the primary model
      const aMatchesThinking = defA.supportsThinking === primaryDef?.supportsThinking;
      const bMatchesThinking = defB.supportsThinking === primaryDef?.supportsThinking;
      if (aMatchesThinking && !bMatchesThinking) return -1;
      if (!aMatchesThinking && bMatchesThinking) return 1;

      // 2. Prioritize 'google' provider for reliability/daily resets
      if (defA.provider === 'google' && defB.provider !== 'google') return -1;
      if (defA.provider !== 'google' && defB.provider === 'google') return 1;

      return 0;
    })
    .slice(0, 5); // Limit to top 5 fallbacks

  return [primaryModelName, ...others];
}

export async function chatCompletion({
  messages,
  modelName,
  isThinkingEnabled,
  abortSignal,
  previousModelName,
  sessionId,
  projectContext,
  modeId,
}: {
  messages: any[];
  modelName: string;
  isThinkingEnabled?: boolean;
  abortSignal?: AbortSignal;
  previousModelName?: string;
  sessionId?: string;
  projectContext?: ProjectContext;
  modeId?: string;
}) {
  const providers = await getProviders();

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

  const modePrompt = getModeSystemPrompt(modeId);
  const modeAwarePrompt = modePrompt ? `${SYSTEM_PROMPT}\n${modePrompt}` : SYSTEM_PROMPT;
  const fullSystemPrompt = getSmartSystemPrompt(modeAwarePrompt, projectContext);

  const errors: string[] = [];
  const chain = await buildFallbackChain(modelName, sessionId);
  const uniqueChain = Array.from(new Set(chain));

  let searchProvider = 'tavily';
  try {
    const stored = await DatabaseService.getConfig('search-provider');
    if (stored) searchProvider = stored;
  } catch {
    searchProvider = 'tavily';
  }

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
        tools: {
          writeArtifact: writeArtifactTool,
          ...allTools.reduce((acc, t) => {
            const name = (t as any).name || (t as any).toolName;
            if (name) {
              if (name === 'web_search' && (t as any).description) {
                (t as any).description = `Search the web for current information using ${searchProvider}. Use when you need up-to-date data, recent news, documentation, or facts beyond your training cutoff. Trigger on keywords like: search, research, find, look up, latest, news, recent, current, what is, who is, explain, define, compare, how to, verify, check, troubleshoot, fix, debug, status, update, trends, documentation, guide, tutorial, example, vs, versus, difference, best, top, ranking, list, data, facts, details, info, information, background, context, overview, breakdown, summary, elaborate, describe, explain, confirm, validate, fact-check, ensure, correct, accurate, true, real, legitimate, credible, source, citation, reference, proof, evidence, method, approach, strategy, technique, solution, workaround, resolve, recipe, sample, specification, spec, API, docs.`;
              }
              if ((t as any).inputSchema) {
                const isAlreadyWrapped = typeof (t as any).inputSchema?.validate === 'function';
                acc[name] = isAlreadyWrapped ? t : tool({
                  description: (t as any).description,
                  inputSchema: zodSchema((t as any).inputSchema),
                  execute: (t as any).execute,
                });
              } else {
                acc[name] = t;
              }
            }
            return acc;
          }, {} as any),
        },
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

// ── Session title generation ─────────────────────────────────────────

export async function generateSessionTitle(userMessage: string): Promise<string> {
  const providers = await getProviders();
  const errors: string[] = [];

  const candidates = (() => {
    const stored = getStoredSelectedModel();
    const def = getModelDefinition(stored);
    if (def && def.provider in providers) {
      return [stored, ...getAIModels().filter(m => m !== stored)];
    }
    return getAIModels();
  })();

  for (const modelId of candidates) {
    const def = getModelDefinition(modelId);
    if (!def) continue;
    const provider = providers[def.provider as keyof typeof providers];
    if (!provider) continue;
    try {
      const { text } = await generateText({
        model: (provider as any)(modelId.includes('/') ? modelId.split('/').slice(1).join('/') : modelId),
        system: 'Read the user\'s request below. Summarise in 5 words or fewer — just the core intent, no articles, no punctuation. Do not use quotes. Do not add commentary.',
        messages: [{ role: 'user', content: userMessage }],
        maxRetries: 1,
      });
      const cleaned = text.replace(/["''"]/g, '').trim();
      if (cleaned) return cleaned.length > 60 ? cleaned.slice(0, 60) : cleaned;
    } catch (e: any) {
      errors.push(`${modelId}: ${e?.message || 'unknown error'}`);
      continue;
    }
  }

  console.warn('All models failed for title generation:', errors.join(' | '));
  return 'New conversation';
}
