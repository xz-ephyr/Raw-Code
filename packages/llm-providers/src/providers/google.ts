import { Effect } from "effect"
import { Route, type AnyRoute } from "../route/client"
import { Auth } from "../route/auth"
import { Endpoint } from "../route/endpoint"
import { HttpTransport } from "../route/transport"
import { Framing } from "../route/framing"
import { OpenAIProtocol } from "../protocols/openai-chat"
import type { OpenAIChatBody } from "../protocols/openai-chat"
import type { LLMRequest } from "../schema"

const baseURL = "https://generativelanguage.googleapis.com/v1beta/openai"

const auth = Auth.custom((input) => {
  const apiKey = Auth.bearer(Auth.config("GOOGLE_API_KEY"))
  return Auth.toEffect(apiKey)(input).pipe(
    Effect.map((h) => {
      const { authorization, ...rest } = h
      const key = authorization?.replace("Bearer ", "")
      return {
        ...rest,
        "x-goog-api-key": key ?? "",
      }
    }),
  )
})

const endpoint = Endpoint.path<OpenAIChatBody>("/chat/completions", { baseURL })

const framing = Framing.sse

const transport = HttpTransport.httpJson<OpenAIChatBody, string>({ framing })

function sanitizeGeminiBody(body: OpenAIChatBody): OpenAIChatBody {
  const out = { ...body } as any
  delete out.frequency_penalty
  delete out.presence_penalty
  delete out.seed
  delete out.reasoning_effort
  delete out.user
  delete out.metadata
  delete out.logit_bias
  delete out.top_logprobs
  delete out.logprobs
  if (out.response_format?.type === "json_schema") {
    const { strict, ...rest } = out.response_format.json_schema
    out.response_format.json_schema = rest
  }
  // Ensure model is a valid Gemini model name
  if (out.model?.startsWith("gpt-")) {
    out.model = "gemini-1.5-flash"
  }
  return out
}

export function logGeminiBody(body: OpenAIChatBody): OpenAIChatBody {
  console.log("[Google] Sending body:", JSON.stringify(body, null, 2))
  return body
}

export const GoogleProtocol = {
  ...OpenAIProtocol,
  body: {
    schema: OpenAIProtocol.body.schema,
    from: (request: LLMRequest) =>
      OpenAIProtocol.body.from(request).pipe(
        Effect.map(sanitizeGeminiBody),
        Effect.map(logGeminiBody),
      ),
  },
}

export const gemini25Flash = Route.make<OpenAIChatBody, any, string>({
  id: "gemini-2.5-flash",
  provider: "google",
  protocol: GoogleProtocol as typeof OpenAIProtocol,
  endpoint,
  auth,
  transport,
  defaults: {
    headers: { "Content-Type": "application/json" },
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 1048576, output: 8192 },
  },
})

export const gemini25Pro = Route.make<OpenAIChatBody, any, string>({
  id: "gemini-2.5-pro",
  provider: "google",
  protocol: GoogleProtocol as typeof OpenAIProtocol,
  endpoint,
  auth,
  transport,
  defaults: {
    headers: { "Content-Type": "application/json" },
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 2097152, output: 8192 },
  },
})

export const gemini25FlashLite = Route.make<OpenAIChatBody, any, string>({
  id: "gemini-2.5-flash-lite",
  provider: "google",
  protocol: GoogleProtocol as typeof OpenAIProtocol,
  endpoint,
  auth,
  transport,
  defaults: {
    headers: { "Content-Type": "application/json" },
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 1048576, output: 8192 },
  },
})

export const gemma431bIt = Route.make<OpenAIChatBody, any, string>({
  id: "gemma-4-31b-it",
  provider: "google",
  protocol: GoogleProtocol as typeof OpenAIProtocol,
  endpoint,
  auth,
  transport,
  defaults: {
    headers: { "Content-Type": "application/json" },
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 1048576, output: 8192 },
  },
})

export const gemma426bIt = Route.make<OpenAIChatBody, any, string>({
  id: "gemma-4-26b-a4b-it",
  provider: "google",
  protocol: GoogleProtocol as typeof OpenAIProtocol,
  endpoint,
  auth,
  transport,
  defaults: {
    headers: { "Content-Type": "application/json" },
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 1048576, output: 8192 },
  },
})

export const all: ReadonlyArray<AnyRoute> = [gemini25Flash, gemini25Pro, gemini25FlashLite, gemma431bIt, gemma426bIt]

export default all
