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
} from '@doktor/llm-providers';
import type { LLMEvent } from '@doktor/llm-providers';
import { allRoutes, getRouteByModelId } from '@doktor/llm-providers/providers/model-routes';
import { createToolLoop } from '@doktor/llm-providers';
import { materialize } from '@doktor/tool-runtime';
import { query } from '../db.js';

/**
 * Maps app_config `configKey` values to the env var that `@doktor/llm-providers`
 * `Auth.config()` expects. Keys live in the SQLite `app_config` table; the
 * llm-providers layer reads them from the environment, so we hydrate env from DB
 * before running a real cloud request.
 */
const CONFIG_KEY_TO_ENV: Record<string, string> = {
  'anthropic-api-key': 'ANTHROPIC_API_KEY',
  'openai-api-key': 'OPENAI_API_KEY',
  'google-api-key': 'GOOGLE_API_KEY',
  'deepseek-api-key': 'DEEPSEEK_API_KEY',
  'mistral-api-key': 'MISTRAL_API_KEY',
  'cohere-api-key': 'COHERE_API_KEY',
  'groq-api-key': 'GROQ_API_KEY',
  'together-api-key': 'TOGETHER_API_KEY',
  'openrouter-api-key': 'OPENROUTER_API_KEY',
  'nvidia-api-key': 'NVIDIA_API_KEY',
  'cerebras-api-key': 'CEREBRAS_API_KEY',
  'sambanova-api-key': 'SAMBANOVA_API_KEY',
  'huggingface-api-key': 'HUGGINGFACE_API_KEY',
  'cloudflare-api-key': 'CLOUDFLARE_API_KEY',
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
  onEvent: (evt: AntigravityEvent) => void;
}

function convertMessages(msgs: Array<{ role: string; content: unknown }>) {
  return msgs
    .filter((m) => m.role !== 'system')
    .map((m) => {
      const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      switch (m.role) {
        case 'user':
          return nativeUserMessage(text);
        case 'assistant':
          return nativeAssistantMessage(text);
        case 'tool':
          return nativeToolMessage({
            id: (m as any).toolCallId ?? '',
            name: (m as any).toolName ?? '',
            result: text,
          });
        default:
          return nativeUserMessage(text);
      }
    });
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
      const message = typeof raw === 'string' ? raw : JSON.stringify(raw);
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
  const toolDefs = mat.definitions.map((d) =>
    makeToolDefinition({ name: d.name, description: d.description, inputSchema: d.inputSchema }),
  );

  const systemText =
    input.systemPrompt ??
    'You are an Antigravity Agent — a cloud-powered advanced processing agent. Be concise and accurate.';

  const request = new LLMRequest({
    model,
    system: [SystemPart.make(systemText)],
    messages: convertMessages(input.messages),
    tools: input.model && input.model !== 'antigravity-1' ? toolDefs : [],
    http: new HttpOptions({ headers: { 'Content-Type': 'application/json' } }),
  });

  const loop = createToolLoop({ routes: [route] });

  const executor = (call: { id: string; name: string; input: unknown }) =>
    Effect.tryPromise({
      try: () =>
        mat.settle(
          { id: call.id, name: call.name, input: call.input },
          { sessionID: '', agentID: 'antigravity', assistantMessageID: '', toolCallID: call.id },
        ),
      catch: (err) => new Error(String(err)),
    }).pipe(
      Effect.flatMap((result) => {
        if (result.type === 'error') return Effect.fail(new Error(result.message));
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
        const ag = toAntigravityEvent(event);
        if (ag) input.onEvent(ag);
      }),
    ),
  );

  input.onEvent({ event: 'done', data: {} });
  return { text: fullText, usage };
}
