import { Effect } from "effect"
import { OpenAIProtocol } from "../protocols/openai-chat"
import type { OpenAIChatBody } from "../protocols/openai-chat"
import { getAllProviderIds } from "../model-registry"

export interface ProviderSanitizeConfig {
  readonly deleteFields?: readonly string[]
  readonly convertJsonSchemaToJsonObject?: boolean
  readonly convertReasoningEffortToMaxTokens?: boolean
  readonly modelMap?: Record<string, string>
  readonly customSanitizer?: (body: OpenAIChatBody) => OpenAIChatBody
}

const DEFAULT_UNSUPPORTED_FIELDS: readonly string[] = [
  "frequency_penalty",
  "presence_penalty",
  "seed",
  "reasoning_effort",
  "user",
  "metadata",
  "logit_bias",
  "top_logprobs",
  "logprobs",
]

export function createSanitizedProtocol(
  baseProtocol: typeof OpenAIProtocol,
  config: ProviderSanitizeConfig = {},
) {
  const unsupportedFields = config.deleteFields ?? DEFAULT_UNSUPPORTED_FIELDS
  const convertJsonSchema = config.convertJsonSchemaToJsonObject ?? true
  const modelMap = config.modelMap ?? {}
  const customSanitizer = config.customSanitizer

  function sanitizeBody(body: OpenAIChatBody): OpenAIChatBody {
    const out = { ...body } as any

    for (const field of unsupportedFields) {
      delete out[field]
    }

    if (convertJsonSchema && out.response_format?.type === "json_schema") {
      const { strict, ...rest } = out.response_format.json_schema
      out.response_format.json_schema = rest
    }

    if (out.model && modelMap[out.model]) {
      out.model = modelMap[out.model]
    }

    if (customSanitizer) {
      return customSanitizer(out)
    }

    return out
  }

  return {
    ...baseProtocol,
    body: {
      schema: baseProtocol.body.schema,
      from: (request: any) =>
        baseProtocol.body.from(request).pipe(
          Effect.map((body: any) => sanitizeBody(body)),
        ),
    },
  }
}

const DEFAULT_SANITIZE_CONFIG: ProviderSanitizeConfig = {
  deleteFields: DEFAULT_UNSUPPORTED_FIELDS,
  convertJsonSchemaToJsonObject: true,
}

export const PROVIDER_SANITIZE_CONFIG: Record<string, ProviderSanitizeConfig> = {}

for (const providerId of getAllProviderIds()) {
  PROVIDER_SANITIZE_CONFIG[providerId] = { ...DEFAULT_SANITIZE_CONFIG }
}

PROVIDER_SANITIZE_CONFIG.google = {
  ...DEFAULT_SANITIZE_CONFIG,
  modelMap: {
    "gpt-4o": "gemini-1.5-flash",
    "gpt-4o-mini": "gemini-1.5-flash",
    "o3": "gemini-1.5-pro",
    "o4-mini": "gemini-1.5-flash",
  },
}

export function getSanitizedProtocol(providerId: string) {
  const config = PROVIDER_SANITIZE_CONFIG[providerId]
  if (!config) return OpenAIProtocol
  return createSanitizedProtocol(OpenAIProtocol, config)
}

export function getProviderSanitizeConfig(providerId: string): ProviderSanitizeConfig {
  return PROVIDER_SANITIZE_CONFIG[providerId] ?? {}
}
