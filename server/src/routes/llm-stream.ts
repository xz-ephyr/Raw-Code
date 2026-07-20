import { Router, type Request, type Response } from 'express'
import { Stream, Effect } from 'effect'
import {
  Auth,
  Service as LLMClientTag,
  layer as llmClientLayer,
  LLMRequest,
  HttpOptions,
  SystemPart,
  userMessage as nativeUserMessage,
  assistantMessage as nativeAssistantMessage,
  toolMessage as nativeToolMessage,
  makeToolDefinition,
  ToolCallPart,
} from '@doktor/llm-providers'
import type { LLMEvent } from '@doktor/llm-providers'
import type { ToolExecutor } from '@doktor/llm-providers'
import { allRoutes, getRouteByModelId } from '@doktor/llm-providers/providers/model-routes'
import { createToolLoop } from '@doktor/llm-providers'
import { injectThinkTool } from '@doktor/llm-providers/adapters/think-tool-inject'
import { getModelCapability } from '@core/reasoning/capabilities'
import { getAppConfig } from '../db.js'
import { materialize } from '@doktor/tool-runtime'
import { initializeConnectorTools } from '@doktor/tool-runtime/connector'
import { registry } from '../connectors/registry.js'

const router = Router()

const routes = allRoutes

function selectRoute(modelName: string) {
  return getRouteByModelId(modelName ?? 'auto') ?? allRoutes[0]
}

function convertMessages(msgs: any[]) {
  const result: any[] = []
  for (const m of msgs) {
    if (m.role === 'system') continue
    switch (m.role) {
      case 'user': {
        const content = typeof m.content === 'string' ? m.content : m.content?.[0]?.text ?? ''
        result.push(nativeUserMessage(content))
        break
      }
      case 'assistant': {
        const textContent = typeof m.content === 'string' ? m.content : ''
        const parts: any[] = textContent ? [{ type: 'text' as const, text: textContent }] : []
        const toolCalls = m.toolInvocations ?? m.toolCalls ?? []
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
        result.push(nativeToolMessage({ id: m.toolCallId ?? '', name: m.toolName ?? '', result: m.content ?? '' }))
        break
      default:
        result.push(nativeUserMessage(String(m.content ?? '')))
        break
    }
  }
  return result
}

function writeSSE(res: Response, type: string, data: unknown, id?: string): void {
  if (id) res.write(`id: ${id}\n`)
  res.write(`event: ${type}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

router.post('/stream', async (req: Request, res: Response) => {
  const { messages, model: modelName, systemPrompt, sessionId } = req.body

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'messages is required' })
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  writeSSE(res, 'connected', {})

  const route = selectRoute(modelName ?? 'auto')

  const providerConfigKey: Record<string, string> = {
    openai: 'openai-api-key',
    anthropic: 'anthropic-api-key',
    google: 'google-api-key',
    deepseek: 'deepseek-api-key',
    mistral: 'mistral-api-key',
    groq: 'groq-api-key',
    cohere: 'cohere-api-key',
    togetherai: 'together-api-key',
    openrouter: 'openrouter-api-key',
    nvidia: 'nvidia-api-key',
    cerebras: 'cerebras-api-key',
    sambanova: 'sambanova-api-key',
    huggingface: 'huggingface-api-key',
    cloudflare: 'cloudflare-api-key',
  }
  const provider = route.provider ?? 'openai'
  const configKey = providerConfigKey[provider]
  let patchedRoute = route
  if (configKey) {
    const dbKey = await getAppConfig(configKey)
    if (dbKey) {
      if (provider === 'anthropic') {
        patchedRoute = route.with({
          auth: Auth.custom((input) =>
            Auth.toEffect(Auth.bearer(Auth.value(dbKey)))(input).pipe(
              Effect.map((headers) => ({ ...headers, 'anthropic-version': '2023-06-01' })),
            ),
          ),
        })
      } else {
        patchedRoute = route.with({ auth: Auth.bearer(Auth.value(dbKey)) })
      }
    }
  }

  const model = route.model({ id: route.id })

  const sid = sessionId || `sse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const baseUrl = `${req.protocol}://${req.get('host')}`
  const connectedProviders = await registry.getConnectedProviders()
  for (const provider of connectedProviders) {
    await initializeConnectorTools({
      sessionID: sid,
      provider,
      baseUrl,
    }).catch(err => console.warn(`[llm-stream] Failed to init connector ${provider}:`, err))
  }

  const mat = materialize({ sessionID: sid })
  const baseToolDefs = mat.definitions.map((d) =>
    makeToolDefinition({ name: d.name, description: d.description, inputSchema: d.inputSchema }),
  )

  const modelId = route.model({ id: route.id }).id
  const capability = getModelCapability(modelId)
  const needsThinkTool = capability.reasoning === 'none'
  const toolDefs = injectThinkTool(baseToolDefs, needsThinkTool)

  const request = new LLMRequest({
    model,
    system: [SystemPart.make(systemPrompt ?? '')],
    messages: convertMessages(messages),
    tools: toolDefs,
    http: new HttpOptions({ headers: { 'Content-Type': 'application/json' } }),
  })

  const loop = createToolLoop({
    routes: [patchedRoute],
    maxSteps: 15,
    timeoutMs: 120_000,
  })

  const resolveCredential = (provider: string): string | undefined => {
    const envMap: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      google: 'GOOGLE_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      mistral: 'MISTRAL_API_KEY',
      groq: 'GROQ_API_KEY',
      cohere: 'COHERE_API_KEY',
      togetherai: 'TOGETHER_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      nvidia: 'NVIDIA_API_KEY',
      cerebras: 'CEREBRAS_API_KEY',
      sambanova: 'SAMBANOVA_API_KEY',
      huggingface: 'HUGGINGFACE_API_KEY',
      cloudflare: 'CLOUDFLARE_API_KEY',
    }
    const envVar = envMap[provider]
    if (envVar) return process.env[envVar]
    return undefined
  }

  const executor: ToolExecutor = (call) =>
    Effect.tryPromise({
      try: () =>
        mat.settle(
          { id: call.id, name: call.name, input: call.input },
          { sessionID: sid, agentID: 'server', assistantMessageID: '', toolCallID: call.id, resolveCredential },
        ),
      catch: (err) => new Error(String(err)),
    }).pipe(
      Effect.flatMap((result) => {
        if (result.type === 'error') return Effect.fail(new Error(result.message))
        return Effect.succeed({ id: call.id, name: call.name, result: result.value })
      }),
    )

  const eventStream = loop(request, executor)

  const abortHandler = () => { res.end() }
  req.on('close', abortHandler)
  req.on('error', abortHandler)

  Effect.runPromise(
    Stream.runForEach(eventStream, (event: LLMEvent) =>
      Effect.sync(() => {
        if (res.destroyed) return
        const eventType = event.type
        writeSSE(res, eventType, event)
      }),
    ),
  ).then(() => {
    if (!res.destroyed) res.end()
  }).catch((err) => {
    if (!res.destroyed) {
      writeSSE(res, 'error', { message: err.message ?? String(err) })
      res.end()
    }
  })
})

router.get('/stream/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  writeSSE(res, 'connected', {})

  const interval = setInterval(() => {
    writeSSE(res, 'heartbeat', {})
  }, 10000)

  req.on('close', () => {
    clearInterval(interval)
    res.end()
  })
})

export default router
