import { streamText, generateText, stepCountIs, convertToModelMessages, wrapLanguageModel, extractReasoningMiddleware } from 'ai';
import { SYSTEM_PROMPT } from '@core/prompt/systemPrompt';
import { buildToolPolicy } from '@core/prompt/toolPolicy';
import { allTools } from '@core/tools/allTools';
import { getModelDefinition, getUsedModels, markModelUsed, getAIModels, getStoredSelectedModel } from '@core/config/models';
import { DatabaseService } from '@core/utils/DatabaseService';
import { getAgentById } from '@core/agents';
import { getProjectMemory, setProjectMemory, deleteProjectMemory, extractFactsFromResult, type ProjectMemoryEntry } from '@core/memory/projectMemory';
import { getSmartSystemPrompt, type ProjectContext } from '@core/memory/contextController';
import { contractContext } from '@core/memory/contextContractor';
import { recordUsage } from '@core/utils/usageTracker';
import { getAllProviders, getProvider, getProviderClient, getModelReasoningConfig } from '@core/providers';

type ProviderClient = any;

interface ProvidersCacheEntry {
  clients: Map<string, ProviderClient>;
  keyHashes: Record<string, string>;
  baseURLOverrides: Record<string, string>;
}

const providersCache = new Map<string, ProvidersCacheEntry>();
const GLOBAL_CACHE_KEY = '__global__';

export function refreshProviders(cacheKey?: string) {
  if (cacheKey) {
    providersCache.delete(cacheKey);
  } else {
    providersCache.clear();
  }
}

async function getProviders(projectId?: string) {
  const cacheKey = projectId || GLOBAL_CACHE_KEY;
  const allProviders = getAllProviders();

  const keyPromises = allProviders.map(async (p) => {
    const key = await DatabaseService.getConfig(p.configKey)
      .then(r => r || localStorage.getItem(p.configKey) || '');
    return { id: p.id, key };
  });

  const baseURLPromises = allProviders
    .map(async (p) => {
      const baseURLKey = `${p.id}-base-url`;
      const baseURL = await DatabaseService.getConfig(baseURLKey)
        .then(r => r || localStorage.getItem(baseURLKey) || p.baseURL);
      return { id: p.id, baseURL };
    });

  const [keyResults, baseURLResults] = await Promise.all([
    Promise.all(keyPromises),
    Promise.all(baseURLPromises),
  ]);

  const currentKeys: Record<string, string> = {};
  for (const r of keyResults) currentKeys[r.id] = r.key;

  const currentBaseURLs: Record<string, string> = {};
  for (const r of baseURLResults) currentBaseURLs[r.id] = r.baseURL;

  const existing = providersCache.get(cacheKey);
  if (existing) {
    let match = true;
    for (const [id, key] of Object.entries(currentKeys)) {
      if (existing.keyHashes[id] !== key) { match = false; break; }
    }
    for (const [id, url] of Object.entries(currentBaseURLs)) {
      if (existing.baseURLOverrides[id] !== url) { match = false; break; }
    }
    if (match) return existing.clients;
  }

  const clients = new Map<string, ProviderClient>();
  for (const p of allProviders) {
    if (currentKeys[p.id]) {
      const client = getProviderClient(p.id, currentKeys[p.id], currentBaseURLs[p.id]);
      if (client) clients.set(p.id, client);
    }
  }

  providersCache.set(cacheKey, {
    clients,
    keyHashes: currentKeys,
    baseURLOverrides: currentBaseURLs,
  });

  return clients;
}

function redactSensitiveInfo(msg: string): string {
  return msg
    .replace(/([?&]key)=[^&\s]+/gi, '$1=REDACTED')
    .replace(/([?&]api_key)=[^&\s]+/gi, '$1=REDACTED')
    .replace(/([?&]api-key)=[^&\s]+/gi, '$1=REDACTED')
    .replace(/x-api-key\s*:\s*\S+/gi, 'x-api-key: REDACTED')
    .replace(/Authorization\s*:\s*Bearer\s*\S+/gi, 'Authorization: Bearer REDACTED');
}

export function getAIErrorMessage(error: unknown) {
  if (error == null) return 'The AI request failed for an unknown reason.';
  let msg: string;
  if (typeof error === 'string') msg = error;
  else if (error instanceof Error) msg = error.message;
  else {
    try {
      msg = JSON.stringify(error);
    } catch {
      return 'The AI request failed and the error could not be serialized.';
    }
  }
  return redactSensitiveInfo(msg);
}

const MAX_STEPS = 20;

async function getConfiguredProviderIds(): Promise<Set<string>> {
  const configured = new Set<string>();
  const allProviders = getAllProviders();
  for (const p of allProviders) {
    const val = await DatabaseService.getConfig(p.configKey)
      .then(r => r || localStorage.getItem(p.configKey) || '');
    if (val && val.trim()) {
      configured.add(p.id);
    }
  }
  return configured;
}

export async function buildFallbackChain(primaryModelName: string, sessionId?: string, projectId?: string): Promise<string[]> {
  const used = sessionId || projectId ? getUsedModels(projectId, sessionId) : [];
  const configuredProviders = await getConfiguredProviderIds();
  const primaryDef = getModelDefinition(primaryModelName);

  const others = getAIModels()
    .filter((m: string) => {
      if (m === primaryModelName) return false;
      if (used.includes(m)) return false;
      const def = getModelDefinition(m);
      if (!def) return false;
      const provider = getProvider(def.provider);
      if (!provider) return false;
      return configuredProviders.has(provider.id);
    })
    .sort((a, b) => {
      const defA = getModelDefinition(a)!;
      const defB = getModelDefinition(b)!;

      const aMatchesThinking = defA.supportsThinking === primaryDef?.supportsThinking;
      const bMatchesThinking = defB.supportsThinking === primaryDef?.supportsThinking;
      if (aMatchesThinking && !bMatchesThinking) return -1;
      if (!aMatchesThinking && bMatchesThinking) return 1;

      const providerA = getProvider(defA.provider);
      const providerB = getProvider(defB.provider);
      if (providerA && providerB) {
        const ids = getAllProviders().map(p => p.id);
        return ids.indexOf(providerA.id) - ids.indexOf(providerB.id);
      }
      return 0;
    })
    .slice(0, 5);

  return [primaryModelName, ...others];
}

export async function chatCompletion({
  messages,
  modelName,
  isThinkingEnabled,
  isWebSearchEnabled = true,
  abortSignal,
  previousModelName,
  sessionId,
  projectContext,
  modeId,
  projectId,
}: {
  messages: any[];
  modelName: string;
  isThinkingEnabled?: boolean;
  isWebSearchEnabled?: boolean;
  abortSignal?: AbortSignal;
  previousModelName?: string;
  sessionId?: string;
  projectContext?: ProjectContext;
  modeId?: string;
  projectId?: string;
}) {
  const providers = await getProviders(projectId);

  const getLanguageModel = (name: string) => {
    const def = getModelDefinition(name);
    if (!def) {
      const firstId = providers.keys().next().value;
      const firstClients = providers.values();
      const fallback = firstClients.next().value;
      const fallbackModel = firstId ? getModelDefinition(firstId) : null;
      return fallback && fallbackModel ? fallback(fallbackModel.id) : null;
    }

    const client = providers.get(def.provider);
    if (!client) return null;

    const model = client(def.id);

    const reasoning = getModelReasoningConfig(name);
    if (reasoning?.mode === 'tag') {
      return wrapLanguageModel({
        model,
        middleware: extractReasoningMiddleware({ tagName: reasoning.tagName ?? 'think' }),
      });
    }
    return model;
  };

  const agent = getAgentById(modeId ?? '');
  const modePrompt = agent?.systemPrompt ?? '';
  const modeAwarePrompt = modePrompt ? `${SYSTEM_PROMPT}\n${modePrompt}` : SYSTEM_PROMPT;

  let projectMemory: ProjectMemoryEntry[] | undefined;
  if (projectId) {
    const allMemory = await getProjectMemory(projectId);
    projectMemory = allMemory.filter(e => e.source !== 'auto-discovered');
  }

  const isNewSession = !previousModelName || !messages || messages.length <= 2;
  const toolPolicy = isNewSession ? buildToolPolicy('new_task') : buildToolPolicy('continuing_session');
  const fullSystemPrompt = getSmartSystemPrompt(modeAwarePrompt, projectContext, projectMemory) + '\n\n' + toolPolicy;

  const errors: string[] = [];
  const chain = await buildFallbackChain(modelName, sessionId, projectId);
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

    const reasoning = getModelReasoningConfig(currentModelName);
    let providerOptions: any = undefined;
    if (shouldApplyThinking && reasoning?.mode === 'native') {
      providerOptions = reasoning.providerOptions;
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
        const contracted = await contractContext(msgs, incomingModel);
        msgs = contracted.messages;

        if (projectId && contracted.summary) {
          const summaryKey = `context-summary-${Date.now()}`;
          setProjectMemory(projectId, summaryKey, contracted.summary, 'auto-summary').catch(e =>
            console.warn('Failed to store context summary:', e)
          );

          getProjectMemory(projectId).then(allMemory => {
            const summaries = allMemory
              .filter(e => e.key.startsWith('context-summary-'))
              .sort((a, b) => b.updatedAt - a.updatedAt);
            if (summaries.length > 5) {
              const toDelete = summaries.slice(5);
              for (const entry of toDelete) {
                deleteProjectMemory(projectId, entry.key).catch(() => {});
              }
            }
          }).catch(() => {});
        }
      }

      const filteredMessages = msgs.filter((m: any) => m.role !== 'system');

      const result = streamText({
        model: currentModel,
        system: fullSystemPrompt,
        messages: filteredMessages,
        tools: allTools.reduce((acc, t) => {
            const toolObj = t as any;
            const name = toolObj.name || toolObj.toolName;
            if (name) {
              if (name === 'web_search') {
                if (!isWebSearchEnabled) return acc;
                if (toolObj.description) {
                  toolObj.description = `Search the web for current information using ${searchProvider}. Use when you need up-to-date data, recent news, documentation, or facts beyond your training cutoff. Trigger on keywords like: search, research, find, look up, latest, news, recent, current, what is, who is, explain, define, compare, how to, verify, check, troubleshoot, fix, debug, status, update, trends, documentation, guide, tutorial, example, vs, versus, difference, best, top, ranking, list, data, facts, details, info, information, background, context, overview, breakdown, summary, elaborate, describe, explain, confirm, validate, fact-check, ensure, correct, accurate, true, real, legitimate, credible, source, citation, reference, proof, evidence, method, approach, strategy, technique, solution, workaround, resolve, recipe, sample, specification, spec, API, docs.`;
                }
              }
              acc[name] = toolObj;
            }
            return acc;
          }, {} as any),
        providerOptions,
        abortSignal,
        maxRetries: 2,
        stopWhen: stepCountIs(MAX_STEPS),
        onError({ error }) {
          console.error(`AI stream failed for ${currentModelName}:`, getAIErrorMessage(error));
        },
        onFinish: (result) => {
          const { usage } = result;
          recordUsage({
            model: currentModelName,
            promptTokens: usage.inputTokens ?? 0,
            completionTokens: usage.outputTokens ?? 0,
            totalTokens: usage.totalTokens ?? 0,
            timestamp: Date.now(),
          });

          // Auto-discover project facts from tool call results
          if (projectId && result.steps) {
            for (const step of result.steps) {
              for (const part of step.content) {
                if (part.type === 'tool-result') {
                  const facts = extractFactsFromResult(part.toolName, part.input, part.output);
                  for (const fact of facts) {
                    setProjectMemory(projectId, fact.key, fact.value, 'auto-discovered').catch(e =>
                      console.warn('Failed to store auto-discovered fact:', e)
                    );
                  }
                }
              }
            }
          }
        },
      });

      return result;
    } catch (error) {
      if (sessionId) {
        markModelUsed(projectId, currentModelName, sessionId);
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
    if (def && providers.has(def.provider)) {
      return [stored, ...getAIModels().filter(m => m !== stored)];
    }
    return getAIModels();
  })();

  for (const modelId of candidates) {
    const def = getModelDefinition(modelId);
    if (!def) continue;
    const provider = providers.get(def.provider);
    if (!provider) continue;
    try {
      const { text } = await generateText({
        model: provider(modelId.includes('/') ? modelId.split('/').slice(1).join('/') : modelId),
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
