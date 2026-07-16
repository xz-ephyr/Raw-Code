import { Router, type Request, type Response } from 'express'
import { Stream, Effect } from 'effect'
import {
  Service as LLMClientTag,
  layer as llmClientLayer,
  LLMRequest,
  SystemPart,
  userMessage as nativeUserMessage,
  assistantMessage as nativeAssistantMessage,
  toolMessage as nativeToolMessage,
  makeToolDefinition,
} from '@doktor/llm-providers'
import type { LLMEvent } from '@doktor/llm-providers'
import type { ToolExecutor } from '@doktor/llm-providers'
import { gpt4o, gpt4oMini, o3, o4Mini } from '@doktor/llm-providers/providers/openai'
import { createToolLoop } from '@doktor/llm-providers'
import { materialize } from '@doktor/tool-runtime'

const router = Router()

const routes = [gpt4o, gpt4oMini, o3, o4Mini]

function selectRoute(modelName: string) {
  switch (modelName) {
    case 'gpt-4o-mini': return gpt4oMini
    case 'o3': return o3
    case 'o4-mini': return o4Mini
    default: return gpt4o
  }
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
    http: { headers: { 'Content-Type': 'application/json' } },
  })

  const loop = createToolLoop({ routes: [route] })

  const executor: ToolExecutor = (call) =>
    Effect.tryPromise({
      try: () =>
        mat.settle(
          { id: call.id, name: call.name, input: call.input },
          { sessionID: '', agentID: 'server', assistantMessageID: '', toolCallID: call.id },
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
