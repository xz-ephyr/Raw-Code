import { Effect, Stream, Layer } from 'effect';
import {
  Service as LLMClientTag,
  layer as llmClientLayer,
  LLMRequest,
  HttpOptions,
  SystemPart,
  userMessage as nativeUserMessage,
  assistantMessage as nativeAssistantMessage,
  toolMessage as nativeToolMessage,
  makeToolDefinition,
  makeToolChoice,
  ToolCallPart,
} from '@doktor/llm-providers';
import type { LLMEvent } from '@doktor/llm-providers';
import { allRoutes, getRouteByModelId } from '@doktor/llm-providers/providers/model-routes';
import { createToolLoop } from '@doktor/llm-providers';
import { injectThinkTool } from '@doktor/llm-providers/adapters/think-tool-inject';
import { getModelCapability } from '@core/reasoning/capabilities';
import { materialize } from '@doktor/tool-runtime';
import { query } from '../db.js';

/**
 * Maps app_config `configKey` values to the env var that `@doktor/llm-providers`
 * `Auth.config()` expects. Keys live in the SQLite `app_config` table; the
 * llm-providers layer reads them from the environment, so we hydrate env from DB
 * before running a real cloud request.
 */
const CONFIG_KEY_TO_ENV: Record<string, string> = {
  'google-api-key': 'GOOGLE_API_KEY',
};

let envHydrated = false;

/**
 * Pulls real provider API keys out of the SQLite `app_config` table and exposes
 * them as environment variables so the llm-providers `Auth.config()` layer can
 * resolve them. Cached after first run; callers may pass `force` to refresh.
 */
export async function hydrateProviderEnv(force = false): Promise<void> {
  if (envHydrated && !force) return;
  try {
    const result = await query('SELECT key, value FROM app_config');
    for (const row of result.rows as Array<{ key: string; value: string }>) {
      const envVar = CONFIG_KEY_TO_ENV[row.key];
      if (!envVar) continue;
      const existing = process.env[envVar];
      if (!existing || existing.length === 0) {
        process.env[envVar] = row.value;
      }
    }
  } catch (err) {
    console.error('[antigravity] Failed to hydrate provider env from DB:', (err as Error).message);
  }
  envHydrated = true;
}

export async function availableProviderModels(): Promise<string[]> {
  await hydrateProviderEnv();
  const models: string[] = [];
  for (const id of Object.values(CONFIG_KEY_TO_ENV)) {
    if (process.env[id] && process.env[id]!.length > 0) {
      // route exists for this provider family
    }
  }
  return models;
}

export interface AntigravityEvent {
  event: string;
  data: Record<string, unknown>;
}

export interface RunAgentTaskInput {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  enableTools?: boolean;
  forceTools?: boolean;
  /** When set, the backend pre-fetches web research via the `research` tool
   *  (Tavily/Firecrawl/Exa) and injects the sources into the prompt before
   *  generation. This guarantees real web grounding regardless of the model's
   *  tool-calling behavior. */
  researchQuery?: string;
  onEvent: (evt: AntigravityEvent) => void;
}

function convertMessages(msgs: Array<{ role: string; content: unknown }>) {
  const result: Array<any> = []
  for (const m of msgs) {
    if (m.role === 'system') continue
    const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    switch (m.role) {
      case 'user':
        result.push(nativeUserMessage(text))
        break
      case 'assistant': {
        const textContent = typeof m.content === 'string' ? m.content : ''
        const parts: any[] = textContent ? [{ type: 'text' as const, text: textContent }] : []
        const mc = m as any
        const toolCalls = mc.toolInvocations ?? mc.toolCalls ?? []
        for (const tc of toolCalls) {
          parts.push(ToolCallPart.make({ id: tc.toolCallId ?? tc.id, name: tc.toolName ?? tc.name, input: tc.args ?? tc.input }))
        }
        const completedToolResults: { id: string; name: string; result: unknown }[] = []
        for (const tc of toolCalls) {
          const isComplete = tc.state === "result" || tc.state === "error" || tc.status === "complete"
          if (isComplete) {
            completedToolResults.push({ id: tc.toolCallId ?? tc.id, name: tc.toolName ?? tc.name, result: tc.result ?? (tc.state === "error" ? tc.error : "") })
          }
        }
        if (parts.length > 0) {
          result.push(nativeAssistantMessage(parts))
          for (const tr of completedToolResults) {
            result.push(nativeToolMessage(tr))
          }
        }
        break
      }
      case 'tool':
        result.push(nativeToolMessage({
          id: (m as any).toolCallId ?? '',
          name: (m as any).toolName ?? '',
          result: text,
        }))
        break
      default:
        result.push(nativeUserMessage(text))
        break
    }
  }
  return result
}

/**
 * Translates an internal `LLMEvent` to the Antigravity SSE contract documented in
 * `specs/antigravity-api.md` §5.
 */
function toAntigravityEvent(evt: LLMEvent): AntigravityEvent | null {
  switch (evt.type) {
    case 'text-delta':
      return { event: 'text_delta', data: { id: evt.id, text: evt.text } };
    case 'reasoning-delta':
      return { event: 'thinking_delta', data: { id: evt.id, text: evt.text } };
    case 'tool-call':
      return {
        event: 'tool_call_delta',
        data: { id: evt.id, name: evt.name, input: evt.input },
      };
    case 'tool-result':
      return {
        event: 'tool_result_delta',
        data: { id: evt.id, name: evt.name, result: evt.result },
      };
    case 'finish':
      return {
        event: 'finish',
        data: {
          reason: evt.reason,
          usage: evt.usage
            ? {
                inputTokens: evt.usage.inputTokens ?? 0,
                outputTokens: evt.usage.outputTokens ?? 0,
              }
            : { inputTokens: 0, outputTokens: 0 },
        },
      };
    case 'provider-error': {
      const raw = (evt as any).message;
      let message: string;
      if (typeof raw === 'string' && raw !== '[object Object]') {
        message = raw;
      } else {
        const reason = (evt as any).reason;
        const rm = reason?.message ?? reason?.reason?.message;
        message = typeof rm === 'string' ? rm : JSON.stringify(raw ?? reason ?? evt);
      }
      return { event: 'error', data: { code: 'provider_error', message } };
    }
    default:
      return null;
  }
}

/**
 * Runs a real cloud LLM task. Resolves the requested model to a provider route,
 * hydrates real API keys from the DB, executes the model (with tool loop), and
 * streams Antigravity SSE events through `onEvent`. Returns the final assistant
 * text once the stream completes.
 */
export async function runAgentTask(input: RunAgentTaskInput): Promise<{
  text: string;
  usage: { inputTokens: number; outputTokens: number };
}> {
  await hydrateProviderEnv();

  const route = getRouteByModelId(input.model) ?? allRoutes[0];
  const model = route.model({ id: route.id });

  const mat = materialize();
  const baseToolDefs = mat.definitions
    .filter((d) => d.inputSchema)
    .map((d) =>
      makeToolDefinition({
        name: d.name,
        description: d.description,
        inputSchema: d.inputSchema as any,
      }),
    );

  const capability = getModelCapability(input.model);
  const needsThinkTool = capability.reasoning === 'none';
  const toolDefs = injectThinkTool(baseToolDefs, needsThinkTool);

  const systemText =
    input.systemPrompt ??
    'You are an Antigravity Agent — a cloud-powered advanced processing agent. Be concise and accurate.';

  let systemWithResearch = systemText;

  if (input.researchQuery) {
    const researchId = 'research_prefetch';
    input.onEvent({ event: 'tool_call_delta', data: { id: researchId, name: 'research', input: { query: input.researchQuery } } });
    try {
      const result = await mat.settle(
        { id: researchId, name: 'research', input: { query: input.researchQuery, depth: 'deep' } },
        { sessionID: '', agentID: 'antigravity', assistantMessageID: '', toolCallID: researchId },
      );
      const value = result.type === 'success' ? result.value : { summary: 'No research results.', sources: [] };
      const sources = Array.isArray((value as any)?.sources) ? (value as any).sources : [];
      const cited = sources
        .map((s: any, i: number) => `${i + 1}. ${s.title || 'Untitled'} — ${s.url || ''}\n   ${(s.snippet || '').slice(0, 300)}`)
        .join('\n\n');
      input.onEvent({
        event: 'tool_result_delta',
        data: { id: researchId, name: 'research', result: { sourceCount: sources.length, summary: (value as any)?.summary ?? '' } },
      });
      systemWithResearch =
        `${systemText}\n\n## Web research already gathered for you (DO NOT call any research tool — the results are below). ` +
        `Write your report directly from these sources and cite them by URL.\n\n${cited}\n`;
    } catch (err: any) {
      input.onEvent({
        event: 'tool_result_delta',
        data: { id: researchId, name: 'research', result: { error: String(err?.message ?? err) } },
      });
    }
  }

  const request = new LLMRequest({
    model,
    system: [SystemPart.make(systemWithResearch)],
    messages: convertMessages(input.messages),
    tools: input.enableTools ? toolDefs : [],
    toolChoice: input.forceTools && input.enableTools && toolDefs.length > 0 ? makeToolChoice('required') : undefined,
    http: new HttpOptions({ headers: { 'Content-Type': 'application/json' } }),
  });

  const loop = createToolLoop({
    routes: [route],
    maxSteps: 15,
    timeoutMs: 120_000,
  });

  const executor = (call: { id: string; name: string; input: unknown }) =>
    Effect.tryPromise({
      try: () =>
        mat.settle(
          { id: call.id, name: call.name, input: call.input },
          { sessionID: '', agentID: 'antigravity', assistantMessageID: '', toolCallID: call.id },
        ),
      catch: (err) => new Error(err instanceof Error ? err.message : JSON.stringify(err)),
    }).pipe(
      Effect.flatMap((result) => {
        if (result.type === 'error') {
          return Effect.fail(new Error(result.message));
        }
        return Effect.succeed({ id: call.id, name: call.name, result: result.value });
      }),
    );

  const eventStream = loop(request, executor as any);

  let fullText = '';
  let usage = { inputTokens: 0, outputTokens: 0 };

  await Effect.runPromise(
    Stream.runForEach(eventStream, (event: LLMEvent) =>
      Effect.sync(() => {
        if (event.type === 'text-delta') fullText += event.text;
        if (event.type === 'finish' && event.usage) {
          usage = {
            inputTokens: event.usage.inputTokens ?? 0,
            outputTokens: event.usage.outputTokens ?? 0,
          };
        }
        if (event.type === 'provider-error') {
          console.error('[antigravity] provider-error:', (event as any).message);
        }
        const ag = toAntigravityEvent(event);
        if (ag) input.onEvent(ag);
      }),
    ),
  );

  input.onEvent({ event: 'done', data: {} });
  return { text: fullText, usage };
}
