import { Effect } from "effect"
import { GeminiProtocol } from "../protocols/google-gemini"
import type { GeminiRequestBody } from "../protocols/google-gemini"

export interface ProviderSanitizeConfig {
  readonly deleteFields?: readonly string[]
  readonly convertJsonSchemaToJsonObject?: boolean
  readonly convertReasoningEffortToMaxTokens?: boolean
  readonly modelMap?: Record<string, string>
  readonly customSanitizer?: (body: GeminiRequestBody) => GeminiRequestBody
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
  baseProtocol: typeof GeminiProtocol,
  config: ProviderSanitizeConfig = {},
) {
  const unsupportedFields = config.deleteFields ?? DEFAULT_UNSUPPORTED_FIELDS
  const convertJsonSchema = config.convertJsonSchemaToJsonObject ?? true
  const modelMap = config.modelMap ?? {}
  const customSanitizer = config.customSanitizer

  function sanitizeBody(body: GeminiRequestBody): GeminiRequestBody {
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

export const PROVIDER_SANITIZE_CONFIG: Record<string, ProviderSanitizeConfig> = {
  google: {
    deleteFields: DEFAULT_UNSUPPORTED_FIELDS,
    convertJsonSchemaToJsonObject: true,
  },
}

export function getSanitizedProtocol(providerId: string) {
  const config = PROVIDER_SANITIZE_CONFIG[providerId]
  if (!config) return GeminiProtocol
  return createSanitizedProtocol(GeminiProtocol, config)
}

export function getProviderSanitizeConfig(providerId: string): ProviderSanitizeConfig {
  return PROVIDER_SANITIZE_CONFIG[providerId] ?? {}
}
