import { Effect } from "effect"
import { Route, type AnyRoute } from "../route/client"
import { Auth } from "../route/auth"
import { Endpoint } from "../route/endpoint"
import { HttpTransport } from "../route/transport"
import { Framing } from "../route/framing"
import { GeminiProtocol } from "../protocols/google-gemini"
import type { GeminiRequestBody } from "../protocols/google-gemini"
import { getSanitizedProtocol as getSanitizedProtocolFromConfig } from "./sanitize-config"
import { MODEL_REGISTRY_FALLBACK } from "../model-catalog"

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
    transport: HttpTransport.httpJson<string, string>({ framing: Framing.google }),
    defaults: {
      headers: { "Content-Type": "application/json" },
      limits: input.limits,
    },
  } as any)
}

export const FRONTEND_MODELS: ReadonlyArray<{
  id: string
  provider: string
  baseURL?: string
  apiKeyEnv?: string
}> = MODEL_REGISTRY_FALLBACK.map(m => ({
  id: m.id,
  provider: m.provider,
  baseURL: m.baseURL,
  apiKeyEnv: m.apiKeyEnv,
}))

function buildRoute(m: { id: string; provider: string; baseURL?: string; apiKeyEnv?: string }): AnyRoute {
  return makeGoogleRoute({ id: m.id, baseURL: m.baseURL })
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
