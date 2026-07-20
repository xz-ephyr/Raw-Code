import { Auth } from "@doktor/llm-providers"
import { Route, Endpoint, type AnyRoute } from "@doktor/llm-providers/route"
import { Framing } from "@doktor/llm-providers/route/framing"
import { HttpTransport } from "@doktor/llm-providers/route/transport"
import { OpenAIProtocol } from "@doktor/llm-providers/protocols/openai-chat"
import type { OpenAIChatBody } from "@doktor/llm-providers/protocols/openai-chat"
import { Effect } from "effect"
import { gpt4o, gpt4oMini, o3, o4Mini } from "@doktor/llm-providers/providers/openai"
import { claudeSonnet4, claudeHaiku3, claudeOpus4 } from "@doktor/llm-providers/providers/anthropic"
import { gemini25Flash, gemini25Pro, gemini25FlashLite, gemini31FlashLite, gemma431bIt, gemma426bIt } from "@doktor/llm-providers/providers/google"
import { providerBuilders } from "./bodySanitizers"
import { PROVIDER_CONFIGS, getAllProviderIds } from "@doktor/llm-providers/model-registry"

function proxyURL(baseURL: string): string {
  return `/proxy/${baseURL}`
}

const PROVIDER_PROXY_URLS: Record<string, string> = {}
for (const id of getAllProviderIds()) {
  PROVIDER_PROXY_URLS[id] = proxyURL(PROVIDER_CONFIGS[id].baseURL)
}

const sseFraming = Framing.sse
const jsonTransport = HttpTransport.httpJson<OpenAIChatBody, string>({ framing: sseFraming })

function makeProxyRoute(
  id: string,
  provider: string,
  baseURL: string,
  limits?: { context?: number; output?: number },
): AnyRoute {
  const bodyTransform = providerBuilders[provider]
  return Route.make<OpenAIChatBody, any, string>({
    id,
    provider,
    protocol: OpenAIProtocol,
    endpoint: Endpoint.path<OpenAIChatBody>("/chat/completions", { baseURL }),
    auth: Auth.none,
    transport: jsonTransport,
    defaults: { headers: { "Content-Type": "application/json" }, limits },
    bodyTransform: bodyTransform as any,
  })
}

export const proxyGpt4o = gpt4o.with({
  endpoint: { baseURL: PROVIDER_PROXY_URLS.openai },
  auth: Auth.none,
  bodyTransform: providerBuilders.openai as any,
})

export const proxyGpt4oMini = gpt4oMini.with({
  endpoint: { baseURL: PROVIDER_PROXY_URLS.openai },
  auth: Auth.none,
  bodyTransform: providerBuilders.openai as any,
})

export const proxyO3 = o3.with({
  endpoint: { baseURL: PROVIDER_PROXY_URLS.openai },
  auth: Auth.none,
  bodyTransform: providerBuilders.openai as any,
})

export const proxyO4Mini = o4Mini.with({
  endpoint: { baseURL: PROVIDER_PROXY_URLS.openai },
  auth: Auth.none,
  bodyTransform: providerBuilders.openai as any,
})

const anthropicAuth = Auth.custom((input) => {
  const key = (input.headers["authorization"] || "").replace(/^Bearer\s*/i, "")
  const { authorization, ...rest } = input.headers
  return Effect.succeed({ ...rest, "x-api-key": key, "anthropic-version": "2023-06-01" })
})

export const proxyClaudeSonnet4 = claudeSonnet4.with({
  endpoint: { baseURL: PROVIDER_PROXY_URLS.anthropic },
  auth: anthropicAuth,
  bodyTransform: providerBuilders.anthropic as any,
})

export const proxyClaudeHaiku3 = claudeHaiku3.with({
  endpoint: { baseURL: PROVIDER_PROXY_URLS.anthropic },
  auth: anthropicAuth,
  bodyTransform: providerBuilders.anthropic as any,
})

export const proxyClaudeOpus4 = claudeOpus4.with({
  endpoint: { baseURL: PROVIDER_PROXY_URLS.anthropic },
  auth: anthropicAuth,
  bodyTransform: providerBuilders.anthropic as any,
})

const googleAuth = Auth.custom((input) => {
  const key = (input.headers["authorization"] || "").replace(/^Bearer\s*/i, "")
  const { authorization, ...rest } = input.headers
  return Effect.succeed({ ...rest, "x-goog-api-key": key })
})

export const proxyGemini25Flash = gemini25Flash.with({
  endpoint: { baseURL: PROVIDER_PROXY_URLS.google },
  auth: googleAuth,
})

export const proxyGemini25Pro = gemini25Pro.with({
  endpoint: { baseURL: PROVIDER_PROXY_URLS.google },
  auth: googleAuth,
})

export const proxyGemini25FlashLite = gemini25FlashLite.with({
  endpoint: { baseURL: PROVIDER_PROXY_URLS.google },
  auth: googleAuth,
})

export const proxyGemini31FlashLite = gemini31FlashLite.with({
  endpoint: { baseURL: PROVIDER_PROXY_URLS.google },
  auth: googleAuth,
})

export const proxyGemma431bIt = gemma431bIt.with({
  endpoint: { baseURL: PROVIDER_PROXY_URLS.google },
  auth: googleAuth,
})

export const proxyGemma426bIt = gemma426bIt.with({
  endpoint: { baseURL: PROVIDER_PROXY_URLS.google },
  auth: googleAuth,
})

export const proxyDeepSeek = makeProxyRoute("deepseek", "deepseek", PROVIDER_PROXY_URLS.deepseek, { context: 64000, output: 8192 })
export const proxyMistral = makeProxyRoute("mistral", "mistral", PROVIDER_PROXY_URLS.mistral)
export const proxyCerebras = makeProxyRoute("cerebras", "cerebras", PROVIDER_PROXY_URLS.cerebras)
export const proxyNvidia = makeProxyRoute("nvidia", "nvidia", PROVIDER_PROXY_URLS.nvidia)
export const proxyOpenRouter = makeProxyRoute("openrouter", "openrouter", PROVIDER_PROXY_URLS.openrouter, { context: 128000, output: 4096 })
export const proxyGroq = makeProxyRoute("groq", "groq", PROVIDER_PROXY_URLS.groq)
export const proxyGrok = makeProxyRoute("grok", "grok", PROVIDER_PROXY_URLS.grok)

export const providerRouteMap: Record<string, AnyRoute> = {
  openai: proxyGpt4o,
  anthropic: proxyClaudeSonnet4,
  google: proxyGemini25Flash,
  deepseek: proxyDeepSeek,
  mistral: proxyMistral,
  cerebras: proxyCerebras,
  nvidia: proxyNvidia,
  openrouter: proxyOpenRouter,
  groq: proxyGroq,
  grok: proxyGrok,
}
