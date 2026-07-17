import { Auth } from "@doktor/llm-providers"
import { Route, Endpoint, type AnyRoute } from "@doktor/llm-providers/route"
import { Framing } from "@doktor/llm-providers/route/framing"
import { HttpTransport } from "@doktor/llm-providers/route/transport"
import { OpenAIProtocol } from "@doktor/llm-providers/protocols/openai-chat"
import type { OpenAIChatBody } from "@doktor/llm-providers/protocols/openai-chat"
import { Effect } from "effect"
import { gpt4o, gpt4oMini, o3, o4Mini } from "@doktor/llm-providers/providers/openai"
import { claudeSonnet4, claudeHaiku3, claudeOpus4 } from "@doktor/llm-providers/providers/anthropic"
import { gemini25Flash, gemini25Pro, gemini25FlashLite, gemma431bIt, gemma426bIt } from "@doktor/llm-providers/providers/google"
import { providerBuilders } from "./bodySanitizers"

const OPENAI_PROXY = "/proxy/https://api.openai.com/v1"
const ANTHROPIC_PROXY = "/proxy/https://api.anthropic.com/v1"
const GOOGLE_PROXY = "/proxy/https://generativelanguage.googleapis.com/v1beta/openai"
const DEEPSEEK_PROXY = "/proxy/https://api.deepseek.com/v1"
const MISTRAL_PROXY = "/proxy/https://api.mistral.ai/v1"
const GROQ_PROXY = "/proxy/https://api.groq.com/openai/v1"
const COHERE_PROXY = "/proxy/https://api.cohere.com/compatibility/v1"
const TOGETHER_PROXY = "/proxy/https://api.together.xyz/v1"
const OPENROUTER_PROXY = "/proxy/https://openrouter.ai/api/v1"
const NVIDIA_PROXY = "/proxy/https://integrate.api.nvidia.com/v1"
const CEREBRAS_PROXY = "/proxy/https://api.cerebras.ai/v1"
const SAMBANOVA_PROXY = "/proxy/https://api.sambanova.ai/v1"
const HUGGINGFACE_PROXY = "/proxy/https://api-inference.huggingface.co/v1"
const CLOUDFLARE_PROXY = "/proxy/https://api.cloudflare.com/client/v4"

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
  endpoint: { baseURL: OPENAI_PROXY },
  auth: Auth.none,
  bodyTransform: providerBuilders.openai as any,
})

export const proxyGpt4oMini = gpt4oMini.with({
  endpoint: { baseURL: OPENAI_PROXY },
  auth: Auth.none,
  bodyTransform: providerBuilders.openai as any,
})

export const proxyO3 = o3.with({
  endpoint: { baseURL: OPENAI_PROXY },
  auth: Auth.none,
  bodyTransform: providerBuilders.openai as any,
})

export const proxyO4Mini = o4Mini.with({
  endpoint: { baseURL: OPENAI_PROXY },
  auth: Auth.none,
  bodyTransform: providerBuilders.openai as any,
})

// Anthropic proxy — converts Bearer token to x-api-key + adds anthropic-version
const anthropicAuth = Auth.custom((input) => {
  const key = (input.headers["authorization"] || "").replace(/^Bearer\s*/i, "")
  const { authorization, ...rest } = input.headers
  return Effect.succeed({ ...rest, "x-api-key": key, "anthropic-version": "2023-06-01" })
})

export const proxyClaudeSonnet4 = claudeSonnet4.with({
  endpoint: { baseURL: ANTHROPIC_PROXY },
  auth: anthropicAuth,
  bodyTransform: providerBuilders.anthropic as any,
})

export const proxyClaudeHaiku3 = claudeHaiku3.with({
  endpoint: { baseURL: ANTHROPIC_PROXY },
  auth: anthropicAuth,
  bodyTransform: providerBuilders.anthropic as any,
})

export const proxyClaudeOpus4 = claudeOpus4.with({
  endpoint: { baseURL: ANTHROPIC_PROXY },
  auth: anthropicAuth,
  bodyTransform: providerBuilders.anthropic as any,
})

// Google proxy — converts Bearer token to x-goog-api-key
const googleAuth = Auth.custom((input) => {
  const key = (input.headers["authorization"] || "").replace(/^Bearer\s*/i, "")
  const { authorization, ...rest } = input.headers
  return Effect.succeed({ ...rest, "x-goog-api-key": key })
})

export const proxyGemini25Flash = gemini25Flash.with({
  endpoint: { baseURL: GOOGLE_PROXY },
  auth: googleAuth,
  bodyTransform: providerBuilders.google as any,
})

export const proxyGemini25Pro = gemini25Pro.with({
  endpoint: { baseURL: GOOGLE_PROXY },
  auth: googleAuth,
  bodyTransform: providerBuilders.google as any,
})

export const proxyGemini25FlashLite = gemini25FlashLite.with({
  endpoint: { baseURL: GOOGLE_PROXY },
  auth: googleAuth,
  bodyTransform: providerBuilders.google as any,
})

export const proxyGemma431bIt = gemma431bIt.with({
  endpoint: { baseURL: GOOGLE_PROXY },
  auth: googleAuth,
  bodyTransform: providerBuilders.google as any,
})

export const proxyGemma426bIt = gemma426bIt.with({
  endpoint: { baseURL: GOOGLE_PROXY },
  auth: googleAuth,
  bodyTransform: providerBuilders.google as any,
})

// OpenAI-compatible proxy routes (Auth.none — API key passed in Authorization header)
export const proxyDeepSeek = makeProxyRoute("deepseek", "deepseek", DEEPSEEK_PROXY, { context: 64000, output: 8192 })
export const proxyMistral = makeProxyRoute("mistral", "mistral", MISTRAL_PROXY)
export const proxyGroq = makeProxyRoute("groq", "groq", GROQ_PROXY)
export const proxyCohere = makeProxyRoute("cohere", "cohere", COHERE_PROXY, { context: 128000, output: 4096 })
export const proxyTogether = makeProxyRoute("together", "together", TOGETHER_PROXY, { context: 128000, output: 4096 })
export const proxyOpenRouter = makeProxyRoute("openrouter", "openrouter", OPENROUTER_PROXY, { context: 128000, output: 4096 })
export const proxyNvidia = makeProxyRoute("nvidia", "nvidia", NVIDIA_PROXY)
export const proxyCerebras = makeProxyRoute("cerebras", "cerebras", CEREBRAS_PROXY)
export const proxySambaNova = makeProxyRoute("sambanova", "sambanova", SAMBANOVA_PROXY)
export const proxyHuggingFace = makeProxyRoute("huggingface", "huggingface", HUGGINGFACE_PROXY)

// Cloudflare uses account ID in path, handled at request time
export const proxyCloudflare = makeProxyRoute("cloudflare", "cloudflare", CLOUDFLARE_PROXY)

// Provider ID → default proxy route
export const providerRouteMap: Record<string, AnyRoute> = {
  openai: proxyGpt4o,
  anthropic: proxyClaudeSonnet4,
  google: proxyGemini25Flash,
  deepseek: proxyDeepSeek,
  mistral: proxyMistral,
  groq: proxyGroq,
  cohere: proxyCohere,
  together: proxyTogether,
  openrouter: proxyOpenRouter,
  nvidia: proxyNvidia,
  cerebras: proxyCerebras,
  sambanova: proxySambaNova,
  huggingface: proxyHuggingFace,
  cloudflare: proxyCloudflare,
}
