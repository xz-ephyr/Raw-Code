import { Effect } from "effect"
import { Route, type AnyRoute } from "../route/client"
import { Auth } from "../route/auth"
import { Endpoint } from "../route/endpoint"
import { HttpTransport } from "../route/transport"
import { Framing } from "../route/framing"
import { Framing as FramingGoogle } from "../route/framing"
import { GeminiProtocol } from "../protocols/google-gemini"
import type { GeminiRequestBody } from "../protocols/google-gemini"
import { getSanitizedProtocol as getSanitizedProtocolFromConfig } from "./sanitize-config"
import { MODEL_REGISTRY_FALLBACK } from "../model-catalog"

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

function makeGoogleRoute(input: { id: string; baseURL?: string; limits?: { context?: number; output?: number } }): AnyRoute {
  const baseURL = input.baseURL ?? "https://generativelanguage.googleapis.com/v1beta/openai"
  const isNative = !baseURL.includes("/openai")
  const modelPath = isNative ? `/v1beta/models/${input.id}:streamGenerateContent` : "/chat/completions"
  const protocol = isNative ? GeminiProtocol : getSanitizedProtocolFromConfig("google")
  const endpoint = Endpoint.path<GeminiRequestBody>(modelPath, { baseURL })
  const auth = isNative
    ? Auth.custom((input) => {
        const fromHeaders = input.headers?.authorization?.replace("Bearer ", "")
        const source = fromHeaders ? Auth.value(fromHeaders) : Auth.config("GOOGLE_API_KEY")
        const apiKey = Auth.bearer(source)
        return Auth.toEffect(apiKey)(input).pipe(
          Effect.map((h) => {
            const { authorization, ...rest } = h
            const key = authorization?.replace("Bearer ", "")
            return { ...rest, "x-goog-api-key": key ?? "" }
          }),
        )
      })
    : Auth.bearer(Auth.config("GOOGLE_API_KEY"))
  return Route.make<string, any, string>({
    id: input.id,
    provider: "google",
    protocol,
    endpoint,
    auth,
    transport: HttpTransport.httpJson<string, string>({ framing: FramingGoogle.google }),
    defaults: {
      headers: { "Content-Type": "application/json" },
      limits: input.limits,
    },
  } as any)
}

function getSanitizedProtocol(provider: string) {
  return getSanitizedProtocolFromConfig(provider)
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
}> = MODEL_REGISTRY_FALLBACK.map(m => ({
  id: m.id,
  provider: m.provider,
  baseURL: m.baseURL,
  apiKeyEnv: m.apiKeyEnv,
  isAnthropic: m.provider === 'anthropic',
}))

function buildRoute(m: { id: string; provider: string; baseURL?: string; apiKeyEnv?: string; isAnthropic?: boolean }): AnyRoute {
  if (m.isAnthropic || m.provider === "anthropic") {
    const entry = MODEL_REGISTRY_FALLBACK.find(r => r.id === m.id)
    const limits = entry?.limits ?? { context: 200000, output: 8192 }
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
    return makeGoogleRoute({ id: m.id, baseURL: m.baseURL })
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
  if (modelId === 'auto' || !modelId) return allRoutes.find((r) => r.provider === 'mistral') ?? allRoutes[0]
  return allRoutes.find((r) => r.id === modelId)
}

export function getModelById(modelId: string) {
  return FRONTEND_MODELS.find(m => m.id === modelId)
}

export function getAllModels() {
  return FRONTEND_MODELS
}
