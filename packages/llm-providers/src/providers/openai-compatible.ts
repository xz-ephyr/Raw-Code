import { Route, type AnyRoute } from "../route/client"
import { Auth } from "../route/auth"
import { Endpoint } from "../route/endpoint"
import { HttpTransport } from "../route/transport"
import { Framing } from "../route/framing"
import { OpenAIProtocol } from "../protocols/openai-chat"
import type { OpenAIChatBody } from "../protocols/openai-chat"

const framing = Framing.sse
const transport = HttpTransport.httpJson<OpenAIChatBody, string>({ framing })
const defaults = { headers: { "Content-Type": "application/json" } }

export const makeOpenAICompatible = (input: {
  readonly id: string
  readonly provider: string
  readonly baseURL: string
  readonly apiKeyEnv: string
  readonly model: string
  readonly limits?: { readonly context?: number; readonly output?: number }
}): AnyRoute => {
  const endpoint = Endpoint.path<OpenAIChatBody>("/chat/completions", { baseURL: input.baseURL })
  const auth = Auth.bearer(Auth.config(input.apiKeyEnv))
  return Route.make<OpenAIChatBody, any, string>({
    id: input.id,
    provider: input.provider,
    protocol: OpenAIProtocol,
    endpoint,
    auth,
    transport,
    defaults: {
      ...defaults,
      limits: input.limits,
    },
  })
}

export const openRouter = makeOpenAICompatible({
  id: "openrouter",
  provider: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKeyEnv: "OPENROUTER_API_KEY",
  model: "openrouter/auto",
  limits: { context: 128000, output: 4096 },
})

export const together = makeOpenAICompatible({
  id: "together",
  provider: "together",
  baseURL: "https://api.together.xyz/v1",
  apiKeyEnv: "TOGETHER_API_KEY",
  model: "together/auto",
  limits: { context: 128000, output: 4096 },
})

export const deepSeek = makeOpenAICompatible({
  id: "deepseek",
  provider: "deepseek",
  baseURL: "https://api.deepseek.com/v1",
  apiKeyEnv: "DEEPSEEK_API_KEY",
  model: "deepseek-chat",
  limits: { context: 64000, output: 8192 },
})

export const all: ReadonlyArray<AnyRoute> = [openRouter, together, deepSeek]

export default all
