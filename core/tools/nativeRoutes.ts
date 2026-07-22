import { Auth, Route } from "@doktor/llm-providers"
import { Endpoint, HttpTransport, Framing, type AnyRoute } from "@doktor/llm-providers/route"
import { GeminiProtocol, type GeminiRequestBody } from "@doktor/llm-providers/protocols/google-gemini"
import { Effect } from "effect"
import { gemini25Flash, gemini25Pro, gemini25FlashLite, gemini31FlashLite, gemma431bIt, gemma426bIt } from "@doktor/llm-providers/providers/google"

const GOOGLE_PROXY_URL = `/proxy/https://generativelanguage.googleapis.com`

const googleAuth = Auth.custom((input) => {
  const key = (input.headers["authorization"] || "").replace(/^Bearer\s*/i, "")
  const { authorization, ...rest } = input.headers
  return Effect.succeed({ ...rest, "x-goog-api-key": key })
})

export const proxyGemini25Flash = gemini25Flash.with({
  endpoint: { baseURL: GOOGLE_PROXY_URL },
  auth: googleAuth,
})

export const proxyGemini25Pro = gemini25Pro.with({
  endpoint: { baseURL: GOOGLE_PROXY_URL },
  auth: googleAuth,
})

export const proxyGemini25FlashLite = gemini25FlashLite.with({
  endpoint: { baseURL: GOOGLE_PROXY_URL },
  auth: googleAuth,
})

export const proxyGemini31FlashLite = gemini31FlashLite.with({
  endpoint: { baseURL: GOOGLE_PROXY_URL },
  auth: googleAuth,
})

export const proxyGemma431bIt = gemma431bIt.with({
  endpoint: { baseURL: GOOGLE_PROXY_URL },
  auth: googleAuth,
})

export const proxyGemma426bIt = gemma426bIt.with({
  endpoint: { baseURL: GOOGLE_PROXY_URL },
  auth: googleAuth,
})

const dynamicRouteCache = new Map<string, AnyRoute>()

export function googleRouteForModel(modelId: string): AnyRoute {
  const cached = dynamicRouteCache.get(modelId)
  if (cached) return cached

  const route = Route.make<GeminiRequestBody, any, string>({
    id: modelId,
    provider: "google",
    protocol: GeminiProtocol,
    endpoint: Endpoint.path(`/v1beta/models/${modelId}:streamGenerateContent?alt=sse`, { baseURL: GOOGLE_PROXY_URL }),
    auth: googleAuth,
    transport: HttpTransport.httpJson<GeminiRequestBody, string>({ framing: Framing.sse }),
    defaults: {
      headers: { "Content-Type": "application/json" },
      generation: { maxTokens: 8192, temperature: 0.7 },
      limits: { context: 1048576, output: 8192 },
    },
  })

  dynamicRouteCache.set(modelId, route)
  return route
}

export const providerRouteMap: Record<string, AnyRoute> = {
  google: proxyGemini25Flash,
}

export const modelRouteMap: Record<string, AnyRoute> = {
  "gemini-2.5-flash": proxyGemini25Flash,
  "gemini-2.5-pro": proxyGemini25Pro,
  "gemini-2.5-flash-lite": proxyGemini25FlashLite,
  "gemini-3.1-flash-lite-preview": proxyGemini31FlashLite,
  "gemma-4-31b-it": proxyGemma431bIt,
  "gemma-4-26b-a4b-it": proxyGemma426bIt,
}
