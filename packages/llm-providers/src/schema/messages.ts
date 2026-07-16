import { Schema } from "effect"
import { JsonSchema, MessageRole, ProviderMetadata } from "./ids"
import { CacheHint, CachePolicy, GenerationOptions, HttpOptions, ModelSchema, ProviderOptions } from "./options"
import { isRecord } from "../utils/record"

const SystemPartSchema = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
  cache: Schema.optional(CacheHint),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
})
export type SystemPart = Schema.Schema.Type<typeof SystemPartSchema>

const makeSystemPart = (text: string): SystemPart => ({ type: "text", text })

export const SystemPart = Object.assign(SystemPartSchema, {
  make: makeSystemPart,
  content: (input?: string | SystemPart | ReadonlyArray<SystemPart>) => {
    if (input === undefined) return [] as SystemPart[]
    return typeof input === "string" ? [makeSystemPart(input)] : Array.isArray(input) ? [...input] : [input]
  },
})

export const TextPart = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
  cache: Schema.optional(CacheHint),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type TextPart = Schema.Schema.Type<typeof TextPart>

export const MediaPart = Schema.Struct({
  type: Schema.Literal("media"),
  mediaType: Schema.String,
  data: Schema.Union(Schema.String, Schema.Uint8ArrayFromSelf),
  filename: Schema.optional(Schema.String),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
})
export type MediaPart = Schema.Schema.Type<typeof MediaPart>

import { ToolTextContent, ToolFileContent, ToolContent as ToolContentSchema } from "@doktor/schema/llm"
export { ToolTextContent, ToolFileContent }
export type ToolContent = Schema.Schema.Type<typeof ToolContentSchema>

const isToolResultValue = (value: unknown): value is ToolResultValue =>
  isRecord(value) &&
  (value.type === "text" || value.type === "json" || value.type === "error" || value.type === "content") &&
  "value" in value

export const ToolResultValue = Object.assign(
  Schema.Union(
    Schema.Struct({
      type: Schema.Literal("json"),
      value: Schema.Unknown,
    }),
    Schema.Struct({
      type: Schema.Literal("text"),
      value: Schema.Unknown,
    }),
    Schema.Struct({
      type: Schema.Literal("error"),
      value: Schema.Unknown,
    }),
    Schema.Struct({
      type: Schema.Literal("content"),
      value: Schema.Array(ToolContentSchema),
    }),
  ),
  {
    is: isToolResultValue,
    make: (value: unknown, type: ToolResultValue["type"] = "json"): ToolResultValue => {
      if (isToolResultValue(value)) return value
      if (type === "content") return { type, value: Array.isArray(value) ? value : [] }
      return { type, value }
    },
  },
)
export type ToolResultValue = Schema.Schema.Type<typeof ToolResultValue>

export interface ToolOutput {
  readonly structured: unknown
  readonly content: ReadonlyArray<ToolContent>
}

export const ToolOutput = Object.assign(
  Schema.Struct({
    structured: Schema.Unknown,
    content: Schema.Array(ToolContentSchema),
  }),
  {
    make: (structured: unknown, content: ReadonlyArray<ToolContent> = []): ToolOutput => ({ structured, content }),
    fromResultValue: (result: ToolResultValue): ToolOutput | undefined => {
      switch (result.type) {
        case "json":
          return { structured: result.value, content: [] }
        case "text":
          return { structured: {}, content: [{ type: "text", text: toolResultText(result.value) }] }
        case "content":
          return { structured: {}, content: result.value }
        case "error":
          return undefined
      }
    },
    toResultValue: (output: ToolOutput): ToolResultValue => {
      if (output.content.length === 0) return { type: "json", value: output.structured }
      if (output.content.length === 1 && output.content[0]?.type === "text")
        return { type: "text", value: output.content[0].text }
      return { type: "content", value: output.content }
    },
  },
)

const toolResultText = (value: unknown) => {
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

export const ToolCallPart = Object.assign(
  Schema.Struct({
    type: Schema.Literal("tool-call"),
    id: Schema.String,
    name: Schema.String,
    input: Schema.Unknown,
    providerExecuted: Schema.optional(Schema.Boolean),
    metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
    providerMetadata: Schema.optional(ProviderMetadata),
  }),
  {
    make: (input: Omit<ToolCallPart, "type">): ToolCallPart => ({ type: "tool-call", ...input }),
  },
)
export type ToolCallPart = Schema.Schema.Type<typeof ToolCallPart>

export const ToolResultPart = Object.assign(
  Schema.Struct({
    type: Schema.Literal("tool-result"),
    id: Schema.String,
    name: Schema.String,
    result: ToolResultValue,
    providerExecuted: Schema.optional(Schema.Boolean),
    cache: Schema.optional(CacheHint),
    metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
    providerMetadata: Schema.optional(ProviderMetadata),
  }),
  {
    make: (
      input: Omit<ToolResultPart, "type" | "result"> & {
        readonly result: unknown
        readonly resultType?: ToolResultValue["type"]
      },
    ): ToolResultPart => ({
      type: "tool-result",
      id: input.id,
      name: input.name,
      result: ToolResultValue.make(input.result, input.resultType),
      providerExecuted: input.providerExecuted,
      cache: input.cache,
      metadata: input.metadata,
      providerMetadata: input.providerMetadata,
    }),
  },
)
export type ToolResultPart = Schema.Schema.Type<typeof ToolResultPart>

export const ReasoningPart = Schema.Struct({
  type: Schema.Literal("reasoning"),
  text: Schema.String,
  encrypted: Schema.optional(Schema.String),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type ReasoningPart = Schema.Schema.Type<typeof ReasoningPart>

export const ContentPart = Schema.Union(TextPart, MediaPart, ToolCallPart, ToolResultPart, ReasoningPart)
export type ContentPart = Schema.Schema.Type<typeof ContentPart>

export class Message extends Schema.Class<Message>("LLM.Message")({
  id: Schema.optional(Schema.String),
  role: MessageRole,
  content: Schema.Array(ContentPart),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  native: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
}) {}

export const makeMessage = (input: Message | MessageInput) => {
  if (input instanceof Message) return input
  return new Message({ ...input, content: content(input.content) })
}

type MessageInput = Omit<ConstructorParameters<typeof Message>[0], "content"> & {
  readonly content: string | ContentPart | ReadonlyArray<ContentPart>
}

const text = (value: string): ContentPart => ({ type: "text", text: value })

const content = (input: string | ContentPart | ReadonlyArray<ContentPart>) =>
  typeof input === "string" ? [text(input)] : Array.isArray(input) ? [...input] : [input]

export const userMessage = (content: ContentPart | ReadonlyArray<ContentPart> | string) => makeMessage({ role: "user", content })
export const assistantMessage = (content: ContentPart | ReadonlyArray<ContentPart> | string) => makeMessage({ role: "assistant", content })
export const systemMessage = (content: SystemPart | ReadonlyArray<SystemPart> | string) => makeMessage({ role: "system", content })
export const toolMessage = (result: ToolResultPart | Parameters<typeof ToolResultPart.make>[0]) =>
  makeMessage({ role: "tool", content: ["type" in result ? result : ToolResultPart.make(result)] })

export class ToolDefinition extends Schema.Class<ToolDefinition>("LLM.ToolDefinition")({
  name: Schema.String,
  description: Schema.String,
  inputSchema: JsonSchema,
  outputSchema: Schema.optional(JsonSchema),
  cache: Schema.optional(CacheHint),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  native: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
}) {}

export const makeToolDefinition = (input: ToolDefinition | ConstructorParameters<typeof ToolDefinition>[0]) =>
  input instanceof ToolDefinition ? input : new ToolDefinition(input)

export class ToolChoice extends Schema.Class<ToolChoice>("LLM.ToolChoice")({
  type: Schema.Literal("auto", "none", "required", "tool"),
  name: Schema.optional(Schema.String),
}) {}

export const makeToolChoice = (input: ToolChoice | ConstructorParameters<typeof ToolChoice>[0] | ToolDefinition | string) => {
  if (input instanceof ToolChoice) return input
  if (input instanceof ToolDefinition) return new ToolChoice({ type: "tool", name: input.name })
  if (typeof input === "string") return isMode(input) ? new ToolChoice({ type: input }) : new ToolChoice({ type: "tool", name: input })
  return new ToolChoice(input)
}

type Mode = "auto" | "none" | "required"

const isMode = (value: string): value is Mode => value === "auto" || value === "none" || value === "required"

export const namedToolChoice = (value: string) => new ToolChoice({ type: "tool", name: value })

export const ResponseFormat = Schema.Union(
  Schema.Struct({ type: Schema.Literal("text") }),
  Schema.Struct({ type: Schema.Literal("json"), schema: JsonSchema }),
  Schema.Struct({ type: Schema.Literal("tool"), tool: ToolDefinition }),
)
export type ResponseFormat = Schema.Schema.Type<typeof ResponseFormat>

export class LLMRequest extends Schema.Class<LLMRequest>("LLM.Request")({
  id: Schema.optional(Schema.String),
  model: ModelSchema,
  system: Schema.Array(SystemPart),
  messages: Schema.Array(Message),
  tools: Schema.Array(ToolDefinition),
  toolChoice: Schema.optional(ToolChoice),
  generation: Schema.optional(GenerationOptions),
  providerOptions: Schema.optional(ProviderOptions),
  http: Schema.optional(HttpOptions),
  responseFormat: Schema.optional(ResponseFormat),
  cache: Schema.optional(CachePolicy),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
}) {}

export const llmRequestInput = (request: LLMRequest): ConstructorParameters<typeof LLMRequest>[0] => ({
  id: request.id,
  model: request.model,
  system: request.system,
  messages: request.messages,
  tools: request.tools,
  toolChoice: request.toolChoice,
  generation: request.generation,
  providerOptions: request.providerOptions,
  http: request.http,
  responseFormat: request.responseFormat,
  cache: request.cache,
  metadata: request.metadata,
})

export const updateLLMRequest = (request: LLMRequest, patch: Partial<ConstructorParameters<typeof LLMRequest>[0]>) => {
  if (Object.keys(patch).length === 0) return request
  return new LLMRequest({
    ...llmRequestInput(request),
    ...patch,
    model: patch.model ?? request.model,
  })
}