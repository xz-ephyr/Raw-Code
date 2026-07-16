import { Auth, Route, Endpoint, type AnyRoute } from "@doktor/llm-providers"
import { Framing } from "@doktor/llm-providers/route/framing"
import { HttpTransport } from "@doktor/llm-providers/route/transport"
import { OpenAIProtocol } from "@doktor/llm-providers/protocols/openai-chat"
import type { OpenAIChatBody } from "@doktor/llm-providers/protocols/openai-chat"
import { Effect } from "effect"
import { gpt4o, gpt4oMini, o3, o4Mini } from "@doktor/llm-providers/providers/openai"
import { claudeSonnet4, claudeHaiku3, claudeOpus4 } from "@doktor/llm-providers/providers/anthropic"
import { gemini20Flash, gemini15Pro } from "@doktor/llm-providers/providers/google"

const OPENAI_PROXY = "/proxy/https://api.openai.com/v1"
const ANTHROPIC_PROXY = "/proxy/https://api.anthropic.com/v1"
const GOOGLE_PROXY = "/proxy/https://generativelanguage.googleapis.com/v1beta/openai"
const DEEPSEEK_PROXY = "/proxy/https://api.deepseek.com/v1"
const MISTRAL_PROXY = "/proxy/https://api.mistral.ai/v1"
const GROQ_PROXY = "/proxy/https://api.groq.com/openai/v1"

const sseFraming = Framing.sse
const jsonTransport = HttpTransport.httpJson<OpenAIChatBody, string>({ framing: sseFraming })

function makeProxyRoute(
  id: string,
  provider: string,
  baseURL: string,
  limits?: { context?: number; output?: number },
): AnyRoute {
  return Route.make<OpenAIChatBody, any, string>({
    id,
    provider,
    protocol: OpenAIProtocol,
    endpoint: Endpoint.path<OpenAIChatBody>("/chat/completions", { baseURL }),
    auth: Auth.none,
    transport: jsonTransport,
    defaults: { headers: { "Content-Type": "application/json" }, limits },
  })
}

export const proxyGpt4o = gpt4o.with({
  endpoint: { baseURL: OPENAI_PROXY },
  auth: Auth.none,
})

export const proxyGpt4oMini = gpt4oMini.with({
  endpoint: { baseURL: OPENAI_PROXY },
  auth: Auth.none,
})

export const proxyO3 = o3.with({
  endpoint: { baseURL: OPENAI_PROXY },
  auth: Auth.none,
})

export const proxyO4Mini = o4Mini.with({
  endpoint: { baseURL: OPENAI_PROXY },
  auth: Auth.none,
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
})

export const proxyClaudeHaiku3 = claudeHaiku3.with({
  endpoint: { baseURL: ANTHROPIC_PROXY },
  auth: anthropicAuth,
})

export const proxyClaudeOpus4 = claudeOpus4.with({
  endpoint: { baseURL: ANTHROPIC_PROXY },
  auth: anthropicAuth,
})

// Google proxy — converts Bearer token to x-goog-api-key
const googleAuth = Auth.custom((input) => {
  const key = (input.headers["authorization"] || "").replace(/^Bearer\s*/i, "")
  const { authorization, ...rest } = input.headers
  return Effect.succeed({ ...rest, "x-goog-api-key": key })
})

export const proxyGemini20Flash = gemini20Flash.with({
  endpoint: { baseURL: GOOGLE_PROXY },
  auth: googleAuth,
})

export const proxyGemini15Pro = gemini15Pro.with({
  endpoint: { baseURL: GOOGLE_PROXY },
  auth: googleAuth,
})

// OpenAI-compatible proxy routes (Auth.none — API key passed in Authorization header)
export const proxyDeepSeek = makeProxyRoute("deepseek", "deepseek", DEEPSEEK_PROXY, { context: 64000, output: 8192 })
export const proxyMistral = makeProxyRoute("mistral", "mistral", MISTRAL_PROXY)
export const proxyGroq = makeProxyRoute("groq", "groq", GROQ_PROXY)

// Provider ID → default proxy route
export const providerRouteMap: Record<string, AnyRoute> = {
  openai: proxyGpt4o,
  anthropic: proxyClaudeSonnet4,
  google: proxyGemini20Flash,
  deepseek: proxyDeepSeek,
  mistral: proxyMistral,
  groq: proxyGroq,
}
