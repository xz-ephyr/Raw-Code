import { Effect } from "effect"
import { Route, type AnyRoute } from "../route/client"
import { Auth } from "../route/auth"
import { Endpoint } from "../route/endpoint"
import { HttpTransport } from "../route/transport"
import { Framing } from "../route/framing"
import { AnthropicProtocol } from "../protocols/anthropic-messages"
import type { AnthropicBody } from "../protocols/anthropic-messages"

const baseURL = "https://api.anthropic.com/v1"

const auth = Auth.custom((input) =>
  Auth.toEffect(Auth.bearer(Auth.config("ANTHROPIC_API_KEY")))(input).pipe(
    Effect.map((headers) => ({
      ...headers,
      "anthropic-version": "2023-06-01",
    })),
  ),
)

const endpoint = Endpoint.path<AnthropicBody>("/messages", { baseURL })

const framing = Framing.sse

const transport = HttpTransport.httpJson<AnthropicBody, string>({ framing })

const defaults = {
  headers: { "Content-Type": "application/json" },
  generation: { maxTokens: 8192, temperature: 0.7 },
}

export const claudeSonnet4 = Route.make<AnthropicBody, any, string>({
  id: "claude-sonnet-4",
  provider: "anthropic",
  protocol: AnthropicProtocol,
  endpoint,
  auth,
  transport,
  defaults: {
    ...defaults,
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 200000, output: 8192 },
  },
})

export const claudeHaiku3 = Route.make<AnthropicBody, any, string>({
  id: "claude-haiku-3",
  provider: "anthropic",
  protocol: AnthropicProtocol,
  endpoint,
  auth,
  transport,
  defaults: {
    ...defaults,
    generation: { maxTokens: 4096, temperature: 0.7 },
    limits: { context: 200000, output: 4096 },
  },
})

export const claudeOpus4 = Route.make<AnthropicBody, any, string>({
  id: "claude-opus-4",
  provider: "anthropic",
  protocol: AnthropicProtocol,
  endpoint,
  auth,
  transport,
  defaults: {
    ...defaults,
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 200000, output: 8192 },
  },
})

export const all: ReadonlyArray<AnyRoute> = [claudeSonnet4, claudeHaiku3, claudeOpus4]

export default all
