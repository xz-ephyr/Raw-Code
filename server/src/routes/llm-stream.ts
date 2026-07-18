import { Router, type Request, type Response } from 'express'
import { Stream, Effect } from 'effect'
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
} from '@doktor/llm-providers'
import type { LLMEvent } from '@doktor/llm-providers'
import type { ToolExecutor } from '@doktor/llm-providers'
import { allRoutes, getRouteByModelId } from '@doktor/llm-providers/providers/model-routes'
import { createToolLoop } from '@doktor/llm-providers'
import { materialize } from '@doktor/tool-runtime'

const router = Router()

const routes = allRoutes

function selectRoute(modelName: string) {
  return getRouteByModelId(modelName ?? 'auto') ?? allRoutes[0]
}

function convertMessages(msgs: any[]) {
  return msgs
    .filter((m: any) => m.role !== 'system')
    .map((m: any) => {
      switch (m.role) {
        case 'user': {
          const content = typeof m.content === 'string' ? m.content : m.content?.[0]?.text ?? ''
          return nativeUserMessage(content)
        }
        case 'assistant': {
          const content = typeof m.content === 'string' ? m.content : ''
          return nativeAssistantMessage(content)
        }
        case 'tool':
          return nativeToolMessage({ id: m.toolCallId ?? '', name: m.toolName ?? '', result: m.content ?? '' })
        default:
          return nativeUserMessage(String(m.content ?? ''))
      }
    })
}

function writeSSE(res: Response, type: string, data: unknown, id?: string): void {
  if (id) res.write(`id: ${id}\n`)
  res.write(`event: ${type}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

router.post('/stream', (req: Request, res: Response) => {
  const { messages, model: modelName, systemPrompt } = req.body

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
  const model = route.model({ id: route.id })

  const mat = materialize()
  const toolDefs = mat.definitions.map((d) =>
    makeToolDefinition({ name: d.name, description: d.description, inputSchema: d.inputSchema }),
  )

  const request = new LLMRequest({
    model,
    system: [SystemPart.make(systemPrompt ?? '')],
    messages: convertMessages(messages),
    tools: toolDefs,
    http: new HttpOptions({ headers: { 'Content-Type': 'application/json' } }),
  })

  const loop = createToolLoop({ routes: [route] })

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
          { sessionID: '', agentID: 'server', assistantMessageID: '', toolCallID: call.id, resolveCredential },
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
