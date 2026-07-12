import { streamText, generateText, stepCountIs, convertToModelMessages } from 'ai';
import { SYSTEM_PROMPT } from '@core/prompt/systemPrompt';
import { buildToolPolicy } from '@core/prompt/toolPolicy';
import { allTools } from '@core/tools/allTools';
import { MODELS, getModelDefinition } from '@core/config/models';
import { DatabaseService } from '@core/utils/DatabaseService';
import { getAgentById } from '@core/agents';
import { getProjectMemory, setProjectMemory, deleteProjectMemory, extractFactsFromResult, type ProjectMemoryEntry } from '@core/memory/projectMemory';
import { getSmartSystemPrompt, type ProjectContext } from '@core/memory/contextController';
import { contractContext } from '@core/memory/contextContractor';
import { recordUsage } from '@core/utils/usageTracker';
import { getAllProviders, getProviderClient } from '@core/providers';

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

function buildLanguageModel(name: string, providers: Map<string, ProviderClient>) {
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

  return client(def.id);
}

const CONNECTOR_TOOL_PREFIXES = ['gmail', 'github', 'telegram', 'youtube', 'reddit', 'twitter'];

function buildTools(allToolsList: any[], isWebSearchEnabled: boolean, searchProvider: string, connectedConnectors: string[] = []) {
  return allToolsList.reduce((acc, t) => {
    const toolObj = t as any;
    const name = toolObj.name || toolObj.toolName;
    if (!name) return acc;
    if (name === 'web_search') {
      if (!isWebSearchEnabled) return acc;
      if (toolObj.description) {
        toolObj.description = `Search the web for current information using ${searchProvider}. Use when you need up-to-date data, recent news, documentation, or facts beyond your training cutoff.`;
      }
    }
    for (const prefix of CONNECTOR_TOOL_PREFIXES) {
      if (name.startsWith(`${prefix}_`) && !connectedConnectors.includes(prefix)) return acc;
    }
    acc[name] = toolObj;
    return acc;
  }, {} as any);
}

function getConnectorSystemPrompt(provider: string, identity: string | null): string {
  const blocks: Record<string, (id: string | null) => string> = {
    gmail: (email) => `
### GMAIL CONNECTOR
You have Gmail connected${email ? ` as ${email}` : ''}. Use these tools when the user asks about their email, wants to check their inbox, search messages, read specific emails, or send an email.

- \`gmail_list_messages\` — List/search Gmail inbox. Supports search queries (from:, to:, subject:, after:, before:, is:unread, is:read, has:attachment).
- \`gmail_read_message\` — Read the full content of a specific email by its ID.
- \`gmail_send_message\` — Send an email. Requires recipient, subject, and body.

When the user types "/Gmail" or mentions "Gmail" or asks about their email naturally, interpret this as a request to use the appropriate Gmail tool above.`,
    github: () => `
### GITHUB CONNECTOR
You have GitHub connected. Use these tools when the user asks about repositories, issues, pull requests, or wants to search code on GitHub.

- \`github_list_repos\` — List repositories for a user or organization.
- \`github_list_issues\` — List open issues in a repository.
- \`github_list_prs\` — List open pull requests in a repository.
- \`github_search_code\` — Search code across GitHub repositories.

When the user types "/GitHub" or mentions "GitHub", "repos", "issues", or "PRs", interpret this as a request to use the appropriate GitHub tool above.`,
    youtube: () => `
### YOUTUBE CONNECTOR
You have YouTube connected. Use these tools when the user asks about videos, wants to search YouTube, or check their playlists.

- \`youtube_search_videos\` — Search YouTube videos by query.
- \`youtube_list_playlists\` — List the user's YouTube playlists.
- \`youtube_list_comments\` — List comments on a YouTube video.

When the user types "/YouTube" or mentions "YouTube", "videos", or "playlists", interpret this as a request to use the appropriate YouTube tool above.`,
    telegram: (id) => `
### TELEGRAM CONNECTOR
You have Telegram connected${id ? ` as ${id}` : ''}. Use these tools when the user wants to send a Telegram message or check chat information.

- \`telegram_send_message\` — Send a message to a Telegram chat by chat ID.
- \`telegram_get_chat\` — Get information about a Telegram chat.

When the user types "/Telegram" or mentions "Telegram", interpret this as a request to use the appropriate Telegram tool above.`,
    reddit: () => `
### REDDIT CONNECTOR
You have Reddit connected. Use these tools when the user wants to browse Reddit, search posts, or submit content.

- \`reddit_get_hot\` — Get hot/trending posts from a subreddit.
- \`reddit_search_posts\` — Search Reddit posts by query.
- \`reddit_submit_post\` — Submit a text post to a subreddit.

When the user types "/Reddit" or mentions "Reddit" or a subreddit, interpret this as a request to use the appropriate Reddit tool above.`,
    twitter: () => `
### TWITTER/X CONNECTOR
You have Twitter/X connected. Use these tools when the user asks about their timeline, wants to post a tweet, or search tweets.

- \`twitter_get_timeline\` — Get the user's Twitter timeline (recent tweets).
- \`twitter_post_tweet\` — Post a tweet (max 280 characters).
- \`twitter_search_tweets\` — Search recent tweets by query.
- \`twitter_get_user\` — Get a Twitter user profile by username.

When the user types "/Twitter" or mentions "Twitter" or "tweet", interpret this as a request to use the appropriate Twitter tool above.`,
  };

  const fn = blocks[provider];
  return fn ? fn(identity) : '';
}

function recordStreamUsage(model: string, provider: string, usage: any, success: boolean, startTime: number) {
  recordUsage({
    model,
    provider,
    promptTokens: usage?.inputTokens ?? 0,
    completionTokens: usage?.outputTokens ?? 0,
    totalTokens: usage?.totalTokens ?? 0,
    success,
    latency: Date.now() - startTime,
    timestamp: Date.now(),
  });
}

async function storeAutoDiscoveredFacts(projectId: string, result: any) {
  if (!result.steps) return;
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

async function pruneOldSummaries(projectId: string) {
  try {
    const allMemory = await getProjectMemory(projectId);
    const summaries = allMemory
      .filter(e => e.key.startsWith('context-summary-'))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    if (summaries.length > 5) {
      const toDelete = summaries.slice(5);
      for (const entry of toDelete) {
        deleteProjectMemory(projectId, entry.key).catch(() => {});
      }
    }
  } catch { /* ignore */ }
}

export async function chatCompletion({
  messages,
  modelName,
  isWebSearchEnabled = true,
  connectedConnectors = [],
  abortSignal,
  previousModelName,
  projectContext,
  modeId,
  projectId,
}: {
  messages: any[];
  modelName: string;
  isWebSearchEnabled?: boolean;
  connectedConnectors?: string[];
  abortSignal?: AbortSignal;
  previousModelName?: string;
  projectContext?: ProjectContext;
  modeId?: string;
  projectId?: string;
}) {
  const providers = await getProviders(projectId);
  const currentModelName = modelName;

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

  let connectorPrompt = '';
  if (connectedConnectors.length > 0) {
    try {
      const { ConnectorApi } = await import('@core/utils/ConnectorApi');
      for (const provider of connectedConnectors) {
        try {
          const status = await ConnectorApi.getStatus(provider);
          connectorPrompt += getConnectorSystemPrompt(provider, status.identity);
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }
  let fullSystemPrompt = getSmartSystemPrompt(modeAwarePrompt, projectContext, projectMemory) + connectorPrompt + '\n\n' + toolPolicy;

  const customInstructions = typeof localStorage !== 'undefined' ? localStorage.getItem('ai_rules') || '' : '';
  const responseStyle = typeof localStorage !== 'undefined' ? localStorage.getItem('response_style') || 'balanced' : 'balanced';

  const styleInstructions: Record<string, string> = {
    concise: `\n\n### RESPONSE STYLE: CONCISE\n- Keep responses as short as possible while still answering completely.\n- Prefer bullet points over paragraphs.\n- Skip introductions and conclusions.\n- One sentence per point. No fluff.`,
    balanced: `\n\n### RESPONSE STYLE: BALANCED\n- Use clean markdown. Headings, lists, spacing — make it scannable.\n- Answer decisively. No apologies, no disclaimers.\n- Group related info into sections. One idea = one paragraph.\n- If the answer is short, keep it short.`,
    detailed: `\n\n### RESPONSE STYLE: DETAILED\n- Provide comprehensive answers with full context.\n- Include examples, edge cases, and alternative approaches.\n- Explain reasoning and tradeoffs explicitly.\n- Don't sacrifice depth for brevity.`,
  };

  const styleBlock = styleInstructions[responseStyle] || styleInstructions.balanced;
  fullSystemPrompt += styleBlock;

  if (customInstructions.trim()) {
    fullSystemPrompt += `\n\n### USER CUSTOM INSTRUCTIONS\n${customInstructions.trim()}\n`;
  }

  let searchProvider = 'tavily';
  try {
    const stored = await DatabaseService.getConfig('search-provider');
    if (stored) searchProvider = stored;
  } catch { /* ignore */ }

  const currentModel = buildLanguageModel(currentModelName, providers);
  const def = getModelDefinition(currentModelName);

  const startTime = Date.now();

  try {
    if (!messages || messages.length === 0) {
      throw new Error('Messages array is empty');
    }

    let msgs = messages;
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

    const privacyMode = typeof localStorage !== 'undefined' && localStorage.getItem('privacy_mode') === 'true';
    if (privacyMode) {
      msgs = msgs.map((m: any) => {
        if (m.role === 'user' && m.content) {
          return { ...m, content: '[Privacy mode enabled — message content redacted]' };
        }
        return m;
      });
    }

    if (previousModelName && previousModelName !== currentModelName) {
      const incomingModel = buildLanguageModel(currentModelName, providers);
      if (incomingModel) {
        try {
          const contracted = await contractContext(msgs, incomingModel);
          msgs = contracted.messages;

          if (projectId && contracted.summary) {
            const summaryKey = `context-summary-${Date.now()}`;
            setProjectMemory(projectId, summaryKey, contracted.summary, 'auto-summary').catch(e =>
              console.warn('Failed to store context summary:', e)
            );
            pruneOldSummaries(projectId);
          }
        } catch (e) {
          console.warn('Context contraction failed, continuing with original messages:', e);
        }
      }
    }

    const filteredMessages = msgs.filter((m: any) => m.role !== 'system');

    const result = streamText({
      model: currentModel,
      system: fullSystemPrompt,
      messages: filteredMessages,
      tools: buildTools(allTools, isWebSearchEnabled, searchProvider, connectedConnectors),
      abortSignal,
      maxRetries: 2,
      stopWhen: stepCountIs(MAX_STEPS),
      onError({ error }) {
        console.error(`AI stream failed for ${currentModelName}:`, getAIErrorMessage(error));
      },
      onFinish: (result) => {
        recordStreamUsage(currentModelName, def?.provider ?? 'unknown', result.usage, true, startTime);
        if (projectId) storeAutoDiscoveredFacts(projectId, result);
      },
    });

    return result;
  } catch (error) {
    recordStreamUsage(currentModelName, def?.provider ?? 'unknown', null, false, startTime);
    throw new Error(`Model ${currentModelName} failed: ${getAIErrorMessage(error)}`);
  }
}

// ── Session title generation ─────────────────────────────────────────

function sanitizeForTitleInput(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^[>$]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800);
}

function titleFromHeuristics(message: string): string {
  const msg = message.trim();
  if (!msg || msg.length < 3) return 'Quick check-in';

  const lower = msg.toLowerCase();

  const greetings = ['hi', 'hello', 'hey', 'yo', 'sup'];
  if (greetings.includes(lower)) return 'Quick check-in';

  interface Pattern { regex: RegExp; format: (m: RegExpMatchArray) => string }
  const patterns: Pattern[] = [
    { regex: /^(fix|debug|solve)\s+(.+)/i, format: (m) => `Fix ${m[2].slice(0, 40)}` },
    { regex: /^(implement|add|create|build|make)\s+(.+)/i, format: (m) => `Implement ${m[2].slice(0, 35)}` },
    { regex: /^(refactor|improve|optimize|clean)\s+(.+)/i, format: (m) => `Refactor ${m[2].slice(0, 35)}` },
    { regex: /^(explain|what is|how does|tell me about)\s+(.+)/i, format: (m) => `Explore ${m[2].slice(0, 40)}` },
    { regex: /^how\s+(do i|to|can i)\s+(.+)/i, format: (m) => `How to ${m[2].slice(0, 40)}` },
    { regex: /^why\s+(is|does|did|are)\s+(.+)/i, format: (m) => `Why ${m[2].slice(0, 40)}` },
    { regex: /^(write|generate)\s+(.+)/i, format: (m) => `Write ${m[2].slice(0, 40)}` },
    { regex: /^(update|change|modify)\s+(.+)/i, format: (m) => `Update ${m[2].slice(0, 40)}` },
    { regex: /^(test|testing)\s+(.+)/i, format: (m) => `Test ${m[2].slice(0, 40)}` },
    { regex: /^(review|check)\s+(.+)/i, format: (m) => `Review ${m[2].slice(0, 40)}` },
    { regex: /^(setup|set up|configure)\s+(.+)/i, format: (m) => `Setup ${m[2].slice(0, 38)}` },
  ];

  for (const { regex, format } of patterns) {
    const match = lower.match(regex);
    if (match) {
      const title = format(match);
      return title.charAt(0).toUpperCase() + title.slice(1);
    }
  }

  const filler = new Set(['the', 'a', 'an', 'this', 'my', 'please', 'can', 'you', 'i', 'want', 'to', 'need', 'is', 'it', 'for', 'of', 'in', 'on', 'with', 'do', 'does', 'we', 'me', 'help']);
  const words = msg.split(/\s+/).filter(w => !filler.has(w.toLowerCase()));
  if (words.length > 0) {
    const title = words.slice(0, 5).join(' ');
    return title.length > 50 ? title.slice(0, 47) + '...' : title.charAt(0).toUpperCase() + title.slice(1);
  }

  return 'Code assistance';
}

function tryParseTitle(raw: string): string | null {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.title === 'string' && parsed.title.trim()) return parsed.title.trim();
  } catch { /* not JSON */ }
  const cleaned = trimmed.replace(/^["']|["']$/g, '').replace(/^title[:\s]*/i, '').trim();
  if (cleaned) return cleaned;
  return null;
}

export async function generateSessionTitle(userMessage: string): Promise<string> {
  const sanitized = sanitizeForTitleInput(userMessage);
  if (!sanitized) return 'New conversation';

  const providers = await getProviders();

  const prompt = `Generate a concise, sentence-case title (3-7 words) that captures the main topic or goal of this conversation. The title should be clear enough that the user recognizes the conversation in a list. Use sentence case: capitalize only the first word and proper nouns.

Return JSON with a single "title" field.

Good examples:
{"title": "Fix login button on mobile"}
{"title": "Add OAuth authentication"}
{"title": "Debug failing CI tests"}
{"title": "Refactor API client error handling"}

Bad (too vague): {"title": "Code changes"}
Bad (too long): {"title": "Investigate and fix the issue where the login button does not respond on mobile devices"}
Bad (wrong case): {"title": "Fix Login Button On Mobile"}

Message:
${sanitized}`;

  for (const modelDef of MODELS) {
    const client = providers.get(modelDef.provider);
    if (!client) continue;

    try {
      const model = client(modelDef.id);
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.3,
        maxOutputTokens: 100,
      });
      const title = tryParseTitle(text);
      if (title && title.length <= 80) return title;
    } catch {
      continue;
    }
  }

  return titleFromHeuristics(sanitized);
}
