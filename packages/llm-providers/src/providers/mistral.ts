import { Effect } from "effect"
import { Route } from "../route/client"
import { Auth } from "../route/auth"
import { Endpoint } from "../route/endpoint"
import { HttpTransport } from "../route/transport"
import { Framing } from "../route/framing"
import { OpenAIProtocol } from "../protocols/openai-chat"

function makeOpenAICompatible(input: {
  id: string
  provider: string
  baseURL: string
  apiKeyEnv: string
  limits?: { context?: number; output?: number }
}): any {
  const endpoint = Endpoint.path<string>("/chat/completions", { baseURL: input.baseURL })
  const auth = Auth.bearer(Auth.config(input.apiKeyEnv))
  return Route.make({
    id: input.id,
    provider: input.provider,
    protocol: OpenAIProtocol,
    endpoint,
    auth,
    transport: HttpTransport.httpJson<string, string>({ framing: Framing.sse }),
    defaults: { headers: { "Content-Type": "application/json" }, limits: input.limits },
  } as any)
}

function sanitizeMistralBody(body: any): any {
  const out = { ...body }
  delete out.frequency_penalty
  delete out.presence_penalty
  delete out.seed
  delete out.reasoning_effort
  delete out.user
  delete out.metadata
  delete out.logit_bias
  delete out.top_logprobs
  delete out.logprobs
  // Mistral doesn't support json_schema response_format
  if (out.response_format?.type === "json_schema") {
    out.response_format = { type: "json_object" }
  }
  return out
}

export const MistralProtocol = {
  ...OpenAIProtocol,
  body: {
    schema: OpenAIProtocol.body.schema,
    from: (request: any) =>
      OpenAIProtocol.body.from(request).pipe(
        Effect.map((body: any) => sanitizeMistralBody(body)),
      ),
  },
}

export const mistralModels: any[] = [
  makeOpenAICompatible({
    id: "mistral-small-latest",
    provider: "mistral",
    baseURL: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
  }),
  makeOpenAICompatible({
    id: "mistral-medium-3.5",
    provider: "mistral",
    baseURL: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
  }),
  makeOpenAICompatible({
    id: "mistral-large-latest",
    provider: "mistral",
    baseURL: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
  }),
  makeOpenAICompatible({
    id: "codestral-latest",
    provider: "mistral",
    baseURL: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
  }),
  makeOpenAICompatible({
    id: "pixtral-12b",
    provider: "mistral",
    baseURL: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
  }),
]