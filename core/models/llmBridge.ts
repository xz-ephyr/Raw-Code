import { Effect, Stream } from "effect"
import type { AnyRoute } from "@doktor/llm-providers/route"
import googleRoutes from "@doktor/llm-providers/providers/google"
import type { LLMEvent, SystemPart, Message, Model } from "@doktor/llm-providers/schema"
import { LLMRequest, makeGenerationOptions } from "@doktor/llm-providers/schema"

const allRoutes: ReadonlyArray<AnyRoute> = [
  ...googleRoutes,
]

function convertMessage(message: any): Message | undefined {
  if (!message || !message.role) return undefined
  const content = message.content ?? ""
  switch (message.role) {
    case "system":
      return { role: "system", content: [{ type: "text" as const, text: content }] } as Message
    case "user":
      return { role: "user", content: [{ type: "text" as const, text: content }] } as Message
    case "assistant": {
      const parts: any[] = [{ type: "text", text: content }]
      if (message.tool_calls) {
        for (const tc of message.tool_calls) {
          parts.push({ type: "tool-call", id: tc.id, name: tc.function.name, input: safeJsonParse(tc.function.arguments) })
        }
      }
      return { role: "assistant", content: parts } as Message
    }
    case "tool":
      return {
        role: "tool",
        content: [{
          type: "tool-result" as const,
          id: message.tool_call_id ?? crypto.randomUUID(),
          name: message.name ?? "unknown",
          result: { type: "text" as const, value: message.content },
        }],
      } as Message
    default:
      return undefined
  }
}

function safeJsonParse(raw: string): unknown {
  try { return JSON.parse(raw) } catch { return raw }
}

function getModelForRoute(name: string): Model | undefined {
  const route = allRoutes.find((r) => r.id === name)
  if (!route) return undefined
  return route.model({ provider: route.provider ?? "unknown", id: name })
}

function isRouteModel(name: string): boolean {
  return allRoutes.some((r) => r.id === name)
}

function buildRequest(options: { messages: any[]; modelName: string; system?: string; maxTokens?: number; temperature?: number }): LLMRequest {
  const model = getModelForRoute(options.modelName)
  if (!model) throw new Error(`Route model not found: ${options.modelName}`)

  const systemParts: SystemPart[] = []
  if (options.system) {
    systemParts.push({ type: "text" as const, text: options.system })
  }

  const messages: Message[] = []
  for (const msg of (options.messages ?? [])) {
    if (msg.role === "system") {
      systemParts.push({ type: "text" as const, text: msg.content ?? "" })
      continue
    }
    const converted = convertMessage(msg)
    if (converted) messages.push(converted)
  }

  return new LLMRequest({
    model,
    system: systemParts,
    messages,
    tools: [],
    generation: makeGenerationOptions({ maxTokens: options.maxTokens, temperature: options.temperature }),
  })
}

function findRoute(request: LLMRequest): AnyRoute | undefined {
  return allRoutes.find((r) => r.id === request.model.route.id)
}

const runtime = {
  http: {
    execute: (url: string, body: string, headers: Record<string, string>) =>
      Effect.tryPromise({
        try: async () => {
          const res = await fetch(url, { method: "POST", headers, body })
          return {
            status: res.status,
            headers: Object.fromEntries(res.headers.entries()),
            text: Effect.promise(() => res.text()),
            stream: res.body,
          }
        },
        catch: (err) => new Error(`HTTP request failed: ${err}`),
      }),
  },
}

export async function generateViaRoute(options: { messages: any[]; modelName: string; system?: string; maxTokens?: number; temperature?: number }): Promise<string> {
  const request = buildRequest(options)
  const route = findRoute(request)
  if (!route) throw new Error(`No route found for model: ${options.modelName}`)

  const merged = {
    ...request,
    headers: (route.defaults as any)?.headers,
  }
  const body = await Effect.runPromise(route.body.from(merged as any))
  const prepared = await Effect.runPromise(route.prepareTransport(body, merged as any))
  const events: Array<LLMEvent> = []
  const collected = await Effect.runPromise(Stream.runCollect(route.streamPrepared(prepared, merged as any, runtime)))
  for (const event of collected) { events.push(event) }

  const response = (events.reduce(
    (s: any, e: LLMEvent) => {
      if (e.type === "finish") return { ...s, finishReason: e.reason, usage: e.usage, done: true }
      if (e.type === "text-delta") return { ...s, text: s.text + e.text, events: [...s.events, e] }
      return { ...s, events: [...s.events, e] }
    },
    { text: "", events: [] as LLMEvent[], done: false } as any,
  ))

  if (!response.done) throw new Error("Stream finished without a finish event")
  return response.text
}

export async function* streamViaRoute(options: { messages: any[]; modelName: string; system?: string; maxTokens?: number; temperature?: number }): AsyncGenerator<string, void, unknown> {
  const request = buildRequest(options)
  const route = findRoute(request)
  if (!route) throw new Error(`No route found for model: ${options.modelName}`)

  const merged = { ...request, headers: (route.defaults as any)?.headers }
  const body = await Effect.runPromise(route.body.from(merged as any))
  const prepared = await Effect.runPromise(route.prepareTransport(body, merged as any))

  const collected = await Effect.runPromise(
    Stream.runCollect(route.streamPrepared(prepared, merged as any, runtime)),
  )
  for (const event of collected) {
    if ((event as LLMEvent).type === "text-delta") {
      yield (event as any).text
    }
  }
}

export { isRouteModel, getModelForRoute, allRoutes }
