import { Effect } from "effect"
import { OpenAIProtocol } from "../protocols/openai-chat"
import type { OpenAIChatBody } from "../protocols/openai-chat"

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

export const PROVIDER_SANITIZE_CONFIG: Record<string, ProviderSanitizeConfig> = {
  google: {
    deleteFields: [
      "frequency_penalty",
      "presence_penalty",
      "seed",
      "reasoning_effort",
      "user",
      "metadata",
      "logit_bias",
      "top_logprobs",
      "logprobs",
    ],
    convertJsonSchemaToJsonObject: true,
    modelMap: {
      "gpt-4o": "gemini-1.5-flash",
      "gpt-4o-mini": "gemini-1.5-flash",
      "o3": "gemini-1.5-pro",
      "o4-mini": "gemini-1.5-flash",
    },
  },

  mistral: {
    deleteFields: [
      "frequency_penalty",
      "presence_penalty",
      "seed",
      "reasoning_effort",
      "user",
      "metadata",
      "logit_bias",
      "top_logprobs",
      "logprobs",
    ],
    convertJsonSchemaToJsonObject: true,
  },

  groq: {
    deleteFields: [
      "frequency_penalty",
      "presence_penalty",
      "seed",
      "reasoning_effort",
      "user",
      "metadata",
      "logit_bias",
      "top_logprobs",
      "logprobs",
    ],
    convertJsonSchemaToJsonObject: true,
  },

  cerebras: {
    deleteFields: [
      "frequency_penalty",
      "presence_penalty",
      "seed",
      "reasoning_effort",
      "user",
      "metadata",
      "logit_bias",
      "top_logprobs",
      "logprobs",
    ],
    convertJsonSchemaToJsonObject: true,
  },

  sambanova: {
    deleteFields: [
      "frequency_penalty",
      "presence_penalty",
      "seed",
      "reasoning_effort",
      "user",
      "metadata",
      "logit_bias",
      "top_logprobs",
      "logprobs",
    ],
    convertJsonSchemaToJsonObject: true,
  },

  nvidia: {
    deleteFields: [
      "frequency_penalty",
      "presence_penalty",
      "seed",
      "reasoning_effort",
      "user",
      "metadata",
      "logit_bias",
      "top_logprobs",
      "logprobs",
    ],
    convertJsonSchemaToJsonObject: true,
  },

  deepseek: {
    deleteFields: [
      "frequency_penalty",
      "presence_penalty",
      "seed",
      "reasoning_effort",
      "user",
      "metadata",
      "logit_bias",
      "top_logprobs",
      "logprobs",
    ],
    convertJsonSchemaToJsonObject: true,
  },

  together: {
    deleteFields: [
      "frequency_penalty",
      "presence_penalty",
      "seed",
      "reasoning_effort",
      "user",
      "metadata",
      "logit_bias",
      "top_logprobs",
      "logprobs",
    ],
    convertJsonSchemaToJsonObject: true,
  },

  openrouter: {
    deleteFields: [
      "frequency_penalty",
      "presence_penalty",
      "seed",
      "reasoning_effort",
      "user",
      "metadata",
      "logit_bias",
      "top_logprobs",
      "logprobs",
    ],
    convertJsonSchemaToJsonObject: true,
  },

  huggingface: {
    deleteFields: [
      "frequency_penalty",
      "presence_penalty",
      "seed",
      "reasoning_effort",
      "user",
      "metadata",
      "logit_bias",
      "top_logprobs",
      "logprobs",
    ],
    convertJsonSchemaToJsonObject: true,
  },

  cloudflare: {
    deleteFields: [
      "frequency_penalty",
      "presence_penalty",
      "seed",
      "reasoning_effort",
      "user",
      "metadata",
      "logit_bias",
      "top_logprobs",
      "logprobs",
    ],
    convertJsonSchemaToJsonObject: true,
  },

  cohere: {
    deleteFields: [
      "frequency_penalty",
      "presence_penalty",
      "seed",
      "reasoning_effort",
      "user",
      "metadata",
      "logit_bias",
      "top_logprobs",
      "logprobs",
    ],
    convertJsonSchemaToJsonObject: true,
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