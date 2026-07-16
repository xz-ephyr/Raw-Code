import { Route, type AnyRoute } from "../route/client"
import { Auth } from "../route/auth"
import { Endpoint } from "../route/endpoint"
import { HttpTransport } from "../route/transport"
import { Framing } from "../route/framing"
import { OpenAIProtocol } from "../protocols/openai-chat"
import type { OpenAIChatBody } from "../protocols/openai-chat"

const baseURL = "https://api.openai.com/v1"

const auth = Auth.bearer(Auth.config("OPENAI_API_KEY"))

const endpoint = Endpoint.path<OpenAIChatBody>("/chat/completions", { baseURL })

const framing = Framing.sse

const transport = HttpTransport.httpJson<OpenAIChatBody, string>({ framing })

const defaults = {
  headers: { "Content-Type": "application/json" },
}

export const gpt4o = Route.make<OpenAIChatBody, any, string>({
  id: "gpt-4o",
  provider: "openai",
  protocol: OpenAIProtocol,
  endpoint,
  auth,
  transport,
  defaults: {
    ...defaults,
    generation: { maxTokens: 16384, temperature: 0.7 },
    limits: { context: 128000, output: 16384 },
  },
})

export const gpt4oMini = Route.make<OpenAIChatBody, any, string>({
  id: "gpt-4o-mini",
  provider: "openai",
  protocol: OpenAIProtocol,
  endpoint,
  auth,
  transport,
  defaults: {
    ...defaults,
    generation: { maxTokens: 16384, temperature: 0.7 },
    limits: { context: 128000, output: 16384 },
  },
})

export const o3 = Route.make<OpenAIChatBody, any, string>({
  id: "o3",
  provider: "openai",
  protocol: OpenAIProtocol,
  endpoint,
  auth,
  transport,
  defaults: {
    ...defaults,
    generation: { maxTokens: 100000, temperature: 1 },
    limits: { context: 200000, output: 100000 },
  },
})

export const o4Mini = Route.make<OpenAIChatBody, any, string>({
  id: "o4-mini",
  provider: "openai",
  protocol: OpenAIProtocol,
  endpoint,
  auth,
  transport,
  defaults: {
    ...defaults,
    generation: { maxTokens: 100000, temperature: 1 },
    limits: { context: 200000, output: 100000 },
  },
})

export const gpt4oModels: ReadonlyArray<AnyRoute> = [gpt4o, gpt4oMini]
export const oSeriesModels: ReadonlyArray<AnyRoute> = [o3, o4Mini]
export const all: ReadonlyArray<AnyRoute> = [...gpt4oModels, ...oSeriesModels]

export default all
