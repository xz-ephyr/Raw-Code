import { Effect } from "effect"
import { Route, type AnyRoute } from "../route/client"
import { Auth } from "../route/auth"
import { Endpoint } from "../route/endpoint"
import { HttpTransport } from "../route/transport"
import { Framing } from "../route/framing"
import { OpenAIProtocol } from "../protocols/openai-chat"
import type { OpenAIChatBody } from "../protocols/openai-chat"

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

export const gemini20Flash = Route.make<OpenAIChatBody, any, string>({
  id: "gemini-2.0-flash",
  provider: "google",
  protocol: OpenAIProtocol,
  endpoint,
  auth,
  transport,
  defaults: {
    headers: { "Content-Type": "application/json" },
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 1048576, output: 8192 },
  },
})

export const gemini15Pro = Route.make<OpenAIChatBody, any, string>({
  id: "gemini-1.5-pro",
  provider: "google",
  protocol: OpenAIProtocol,
  endpoint,
  auth,
  transport,
  defaults: {
    headers: { "Content-Type": "application/json" },
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 2097152, output: 8192 },
  },
})

export const all: ReadonlyArray<AnyRoute> = [gemini20Flash, gemini15Pro]

export default all
