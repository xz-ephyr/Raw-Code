import { Effect } from "effect"
import { Route, type AnyRoute } from "../route/client"
import { Auth } from "../route/auth"
import { Endpoint } from "../route/endpoint"
import { HttpTransport } from "../route/transport"
import { Framing } from "../route/framing"
import { GeminiProtocol } from "../protocols/google-gemini"
import type { GeminiRequestBody } from "../protocols/google-gemini"

const baseURL = "https://generativelanguage.googleapis.com"

const auth = Auth.custom((input) => {
  const fromHeaders = input.headers?.authorization?.replace("Bearer ", "")
  const source = fromHeaders ? Auth.value(fromHeaders) : Auth.config("GOOGLE_API_KEY")
  const apiKey = Auth.bearer(source)
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

function makeEndpoint(modelPath: string) {
  return Endpoint.path<GeminiRequestBody>(modelPath, { baseURL })
}

const sseFraming = Framing.sse
const transport = HttpTransport.httpJson<GeminiRequestBody, string>({ framing: sseFraming })

export const gemini25Flash = Route.make<GeminiRequestBody, any, string>({
  id: "gemini-2.5-flash",
  provider: "google",
  protocol: GeminiProtocol,
  endpoint: makeEndpoint("/v1beta/models/gemini-2.5-flash:streamGenerateContent"),
  auth,
  transport,
  defaults: {
    headers: { "Content-Type": "application/json" },
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 1048576, output: 8192 },
  },
})

export const gemini25Pro = Route.make<GeminiRequestBody, any, string>({
  id: "gemini-2.5-pro",
  provider: "google",
  protocol: GeminiProtocol,
  endpoint: makeEndpoint("/v1beta/models/gemini-2.5-pro:streamGenerateContent"),
  auth,
  transport,
  defaults: {
    headers: { "Content-Type": "application/json" },
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 2097152, output: 8192 },
  },
})

export const gemini25FlashLite = Route.make<GeminiRequestBody, any, string>({
  id: "gemini-2.5-flash-lite",
  provider: "google",
  protocol: GeminiProtocol,
  endpoint: makeEndpoint("/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent"),
  auth,
  transport,
  defaults: {
    headers: { "Content-Type": "application/json" },
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 1048576, output: 8192 },
  },
})

export const gemini31FlashLite = Route.make<GeminiRequestBody, any, string>({
  id: "gemini-3.1-flash-lite-preview",
  provider: "google",
  protocol: GeminiProtocol,
  endpoint: makeEndpoint("/v1beta/models/gemini-3.1-flash-lite-preview:streamGenerateContent"),
  auth,
  transport,
  defaults: {
    headers: { "Content-Type": "application/json" },
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 1048576, output: 8192 },
  },
})

export const gemma431bIt = Route.make<GeminiRequestBody, any, string>({
  id: "gemma-4-31b-it",
  provider: "google",
  protocol: GeminiProtocol,
  endpoint: makeEndpoint("/v1beta/models/gemma-4-31b-it:streamGenerateContent"),
  auth,
  transport,
  defaults: {
    headers: { "Content-Type": "application/json" },
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 1048576, output: 8192 },
  },
})

export const gemma426bIt = Route.make<GeminiRequestBody, any, string>({
  id: "gemma-4-26b-a4b-it",
  provider: "google",
  protocol: GeminiProtocol,
  endpoint: makeEndpoint("/v1beta/models/gemma-4-26b-a4b-it:streamGenerateContent"),
  auth,
  transport,
  defaults: {
    headers: { "Content-Type": "application/json" },
    generation: { maxTokens: 8192, temperature: 0.7 },
    limits: { context: 1048576, output: 8192 },
  },
})

export const all: ReadonlyArray<AnyRoute> = [gemini25Flash, gemini25Pro, gemini25FlashLite, gemini31FlashLite, gemma431bIt, gemma426bIt]

export default all
