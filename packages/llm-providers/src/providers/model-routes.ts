import { Effect } from "effect"
import { Route, type AnyRoute } from "../route/client"
import { Auth } from "../route/auth"
import { Endpoint } from "../route/endpoint"
import { HttpTransport } from "../route/transport"
import { Framing } from "../route/framing"
import type { OpenAIChatBody } from "../protocols/openai-chat"
import { GoogleProtocol } from "./google"
import { getSanitizedProtocol as getSanitizedProtocolFromConfig } from "./sanitize-config"

function makeOpenAICompatible(input: {
  id: string
  provider: string
  baseURL: string
  apiKeyEnv: string
  limits?: { context?: number; output?: number }
}): AnyRoute {
  const protocol = getSanitizedProtocol(input.provider)
  const auth = Auth.bearer(Auth.config(input.apiKeyEnv))
  return Route.make<string, any, string>({
    id: input.id,
    provider: input.provider,
    protocol,
    endpoint: Endpoint.path("/chat/completions", { baseURL: input.baseURL }) as any,
    auth,
    transport: HttpTransport.httpJson<string, string>({ framing: Framing.sse }) as any,
    defaults: { headers: { "Content-Type": "application/json" }, limits: input.limits },
  } as any)
}

function makeGoogleRoute(input: { id: string; limits?: { context?: number; output?: number } }): AnyRoute {
  const endpoint = Endpoint.path<OpenAIChatBody>("/chat/completions", { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai" })
  // Google's OpenAI-compatible endpoint expects `Authorization: Bearer <key>`.
  const auth = Auth.bearer(Auth.config("GOOGLE_API_KEY"))
  return Route.make<OpenAIChatBody, any, string>({
    id: input.id,
    provider: "google",
    protocol: GoogleProtocol,
    endpoint,
    auth,
    transport: HttpTransport.httpJson<OpenAIChatBody, string>({ framing: Framing.sse }),
    defaults: {
      headers: { "Content-Type": "application/json" },
      limits: input.limits,
    },
  })
}

function getSanitizedProtocol(provider: string) {
  switch (provider) {
    case "google":
      return GoogleProtocol
    default:
      return getSanitizedProtocolFromConfig(provider)
  }
}

export interface ModelDef {
  id: string
  provider: string
  baseURL?: string
  apiKeyEnv?: string
}

export const FRONTEND_MODELS: ReadonlyArray<{
  id: string
  provider: string
  baseURL?: string
  apiKeyEnv?: string
  isAnthropic?: boolean
}> = [
  { id: "gpt-4o", provider: "openai", baseURL: "https://api.openai.com/v1", apiKeyEnv: "OPENAI_API_KEY" },
  { id: "gpt-4o-mini", provider: "openai", baseURL: "https://api.openai.com/v1", apiKeyEnv: "OPENAI_API_KEY" },
  { id: "o3", provider: "openai", baseURL: "https://api.openai.com/v1", apiKeyEnv: "OPENAI_API_KEY" },
  { id: "o4-mini", provider: "openai", baseURL: "https://api.openai.com/v1", apiKeyEnv: "OPENAI_API_KEY" },
  { id: "claude-sonnet-4", provider: "anthropic", isAnthropic: true },
  { id: "claude-haiku-3", provider: "anthropic" },
  { id: "claude-opus-4", provider: "anthropic" },
  { id: "gemini-2.5-flash", provider: "google", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", apiKeyEnv: "GOOGLE_API_KEY" },
  { id: "gemini-2.5-pro", provider: "google", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", apiKeyEnv: "GOOGLE_API_KEY" },
  { id: "gemini-2.5-flash-lite", provider: "google", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", apiKeyEnv: "GOOGLE_API_KEY" },
  { id: "gemma-4-31b-it", provider: "google", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", apiKeyEnv: "GOOGLE_API_KEY" },
  { id: "gemma-4-26b-a4b-it", provider: "google", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", apiKeyEnv: "GOOGLE_API_KEY" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", provider: "groq", baseURL: "https://api.groq.com/openai/v1", apiKeyEnv: "GROQ_API_KEY" },
  { id: "llama-3.3-70b-versatile", provider: "groq", baseURL: "https://api.groq.com/openai/v1", apiKeyEnv: "GROQ_API_KEY" },
  { id: "qwen/qwen3-32b", provider: "groq", baseURL: "https://api.groq.com/openai/v1", apiKeyEnv: "GROQ_API_KEY" },
  { id: "qwen/qwen3.6-27b", provider: "groq", baseURL: "https://api.groq.com/openai/v1", apiKeyEnv: "GROQ_API_KEY" },
  { id: "openai/gpt-oss-120b", provider: "groq", baseURL: "https://api.groq.com/openai/v1", apiKeyEnv: "GROQ_API_KEY" },
  { id: "cerebras/gpt-oss-120b", provider: "cerebras", baseURL: "https://api.cerebras.ai/v1", apiKeyEnv: "CEREBRAS_API_KEY" },
  { id: "zai-glm-4.7", provider: "cerebras", baseURL: "https://api.cerebras.ai/v1", apiKeyEnv: "CEREBRAS_API_KEY" },
  { id: "gemma-4-31b", provider: "cerebras", baseURL: "https://api.cerebras.ai/v1", apiKeyEnv: "CEREBRAS_API_KEY" },
  { id: "mistral-small-latest", provider: "mistral", baseURL: "https://api.mistral.ai/v1", apiKeyEnv: "MISTRAL_API_KEY" },
  { id: "mistral-medium-3.5", provider: "mistral", baseURL: "https://api.mistral.ai/v1", apiKeyEnv: "MISTRAL_API_KEY" },
  { id: "mistral-large-latest", provider: "mistral", baseURL: "https://api.mistral.ai/v1", apiKeyEnv: "MISTRAL_API_KEY" },
  { id: "codestral-latest", provider: "mistral", baseURL: "https://api.mistral.ai/v1", apiKeyEnv: "MISTRAL_API_KEY" },
  { id: "pixtral-12b", provider: "mistral", baseURL: "https://api.mistral.ai/v1", apiKeyEnv: "MISTRAL_API_KEY" },
  { id: "Meta-Llama-3.3-70B-Instruct", provider: "sambanova", baseURL: "https://api.sambanova.ai/v1", apiKeyEnv: "SAMBANOVA_API_KEY" },
  { id: "DeepSeek-V3.1", provider: "sambanova", baseURL: "https://api.sambanova.ai/v1", apiKeyEnv: "SAMBANOVA_API_KEY" },
  { id: "sambanova/gpt-oss-120b", provider: "sambanova", baseURL: "https://api.sambanova.ai/v1", apiKeyEnv: "SAMBANOVA_API_KEY" },
  { id: "DeepSeek-V3.2", provider: "sambanova", baseURL: "https://api.sambanova.ai/v1", apiKeyEnv: "SAMBANOVA_API_KEY" },
  { id: "gemma-4-31B-it", provider: "sambanova", baseURL: "https://api.sambanova.ai/v1", apiKeyEnv: "SAMBANOVA_API_KEY" },
  { id: "command-a-03-2026", provider: "cohere", baseURL: "https://api.cohere.com/compatibility/v1", apiKeyEnv: "COHERE_API_KEY" },
  { id: "command-a-plus", provider: "cohere", baseURL: "https://api.cohere.com/compatibility/v1", apiKeyEnv: "COHERE_API_KEY" },
  { id: "command-r-plus-08-2024", provider: "cohere", baseURL: "https://api.cohere.com/compatibility/v1", apiKeyEnv: "COHERE_API_KEY" },
  { id: "command-r-08-2024", provider: "cohere", baseURL: "https://api.cohere.com/compatibility/v1", apiKeyEnv: "COHERE_API_KEY" },
  { id: "command-r7b-12-2024", provider: "cohere", baseURL: "https://api.cohere.com/compatibility/v1", apiKeyEnv: "COHERE_API_KEY" },
  { id: "c4ai-aya-expanse-32b", provider: "cohere", baseURL: "https://api.cohere.com/compatibility/v1", apiKeyEnv: "COHERE_API_KEY" },
  { id: "meta-llama/Llama-3.2-11B-Vision-Instruct", provider: "huggingface", baseURL: "https://api-inference.huggingface.co/v1", apiKeyEnv: "HUGGINGFACE_API_KEY" },
  { id: "meta-llama/Meta-Llama-3.1-8B-Instruct", provider: "huggingface", baseURL: "https://api-inference.huggingface.co/v1", apiKeyEnv: "HUGGINGFACE_API_KEY" },
  { id: "Qwen/Qwen2.5-72B-Instruct", provider: "huggingface", baseURL: "https://api-inference.huggingface.co/v1", apiKeyEnv: "HUGGINGFACE_API_KEY" },
  { id: "google/gemma-2-9b-it", provider: "huggingface", baseURL: "https://api-inference.huggingface.co/v1", apiKeyEnv: "HUGGINGFACE_API_KEY" },
  { id: "@cf/meta/llama-3.1-8b-instruct", provider: "cloudflare", baseURL: "https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1", apiKeyEnv: "CLOUDFLARE_API_KEY" },
  { id: "@cf/meta/llama-3.2-3b-instruct", provider: "cloudflare", baseURL: "https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1", apiKeyEnv: "CLOUDFLARE_API_KEY" },
  { id: "@cf/qwen/qwen1.5-7b-chat-awq", provider: "cloudflare", baseURL: "https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1", apiKeyEnv: "CLOUDFLARE_API_KEY" },
  { id: "@cf/microsoft/phi-2", provider: "cloudflare", baseURL: "https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1", apiKeyEnv: "CLOUDFLARE_API_KEY" },
  { id: "nvidia/llama-3.3-nemotron-super-49b-v1", provider: "nvidia", baseURL: "https://integrate.api.nvidia.com/v1", apiKeyEnv: "NVIDIA_API_KEY" },
  { id: "nvidia/nemotron-3-nano-30b-a3b", provider: "nvidia", baseURL: "https://integrate.api.nvidia.com/v1", apiKeyEnv: "NVIDIA_API_KEY" },
  { id: "meta/llama-3.1-8b-instruct", provider: "nvidia", baseURL: "https://integrate.api.nvidia.com/v1", apiKeyEnv: "NVIDIA_API_KEY" },
  { id: "mistralai/mistral-large-3-675b-instruct-2512", provider: "nvidia", baseURL: "https://integrate.api.nvidia.com/v1", apiKeyEnv: "NVIDIA_API_KEY" },
  { id: "deepseek-chat", provider: "deepseek", baseURL: "https://api.deepseek.com/v1", apiKeyEnv: "DEEPSEEK_API_KEY" },
  { id: "deepseek-reasoner", provider: "deepseek", baseURL: "https://api.deepseek.com/v1", apiKeyEnv: "DEEPSEEK_API_KEY" },
  { id: "deepseek-coder", provider: "deepseek", baseURL: "https://api.deepseek.com/v1", apiKeyEnv: "DEEPSEEK_API_KEY" },
]

function buildRoute(m: { id: string; provider: string; baseURL?: string; apiKeyEnv?: string; isAnthropic?: boolean }): AnyRoute {
  if (m.isAnthropic || m.provider === "anthropic") {
    const limits = { context: 200000, output: 8192 }
    return Route.make({
      id: m.id,
      provider: "anthropic",
      protocol: { id: "anthropic-messages" } as any,
      endpoint: { path: "/messages", baseURL: "https://api.anthropic.com/v1" } as any,
      auth: Auth.custom((input: any) =>
        Auth.toEffect(Auth.bearer(Auth.config("ANTHROPIC_API_KEY")))(input).pipe(
          Effect.map((headers: any) => ({ ...headers, "anthropic-version": "2023-06-01" })),
        ),
      ),
      transport: HttpTransport.httpJson<any, string>({ framing: Framing.sse }) as any,
      defaults: { headers: { "Content-Type": "application/json" }, limits },
    } as any)
  }

  if (m.provider === "google") {
    return makeGoogleRoute({ id: m.id, limits: undefined })
  }

  return makeOpenAICompatible({
    id: m.id,
    provider: m.provider,
    baseURL: m.baseURL ?? `https://api.${m.provider}.com/v1`,
    apiKeyEnv: m.apiKeyEnv ?? `${m.provider.toUpperCase()}_API_KEY`,
  })
}

const allRoutes: AnyRoute[] = FRONTEND_MODELS.map(buildRoute)

export { allRoutes }

export function getRouteByModelId(modelId: string): AnyRoute | undefined {
  if (modelId === 'auto' || !modelId) return allRoutes[0]
  return allRoutes.find((r) => r.id === modelId)
}

export function getModelById(modelId: string) {
  return FRONTEND_MODELS.find(m => m.id === modelId)
}

export function getAllModels() {
  return FRONTEND_MODELS
}
