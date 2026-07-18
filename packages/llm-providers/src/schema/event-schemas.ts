import { Schema } from "effect"
import { ContentBlockID, FinishReason, ProviderMetadata, ToolCallID } from "./ids"
import { ProviderFailureClassification } from "./errors"

export class Usage extends Schema.Class<Usage>("LLM.Usage")({
  inputTokens: Schema.optional(Schema.Number),
  outputTokens: Schema.optional(Schema.Number),
  nonCachedInputTokens: Schema.optional(Schema.Number),
  cacheReadInputTokens: Schema.optional(Schema.Number),
  cacheWriteInputTokens: Schema.optional(Schema.Number),
  reasoningTokens: Schema.optional(Schema.Number),
  totalTokens: Schema.optional(Schema.Number),
  providerMetadata: Schema.optional(ProviderMetadata),
}) {
  get visibleOutputTokens() {
    return Math.max(0, (this.outputTokens ?? 0) - (this.reasoningTokens ?? 0))
  }

  static from(input: UsageInput) {
    return input instanceof Usage ? input : new Usage(input)
  }
}

export type UsageInput = Usage | ConstructorParameters<typeof Usage>[0]

export const StepStart = Schema.Struct({
  type: Schema.tag("step-start"),
  index: Schema.Number,
})
export type StepStart = Schema.Schema.Type<typeof StepStart>

export const TextStart = Schema.Struct({
  type: Schema.tag("text-start"),
  id: ContentBlockID,
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type TextStart = Schema.Schema.Type<typeof TextStart>

export const TextDelta = Schema.Struct({
  type: Schema.tag("text-delta"),
  id: ContentBlockID,
  text: Schema.String,
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type TextDelta = Schema.Schema.Type<typeof TextDelta>

export const TextEnd = Schema.Struct({
  type: Schema.tag("text-end"),
  id: ContentBlockID,
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type TextEnd = Schema.Schema.Type<typeof TextEnd>

export const ReasoningStart = Schema.Struct({
  type: Schema.tag("reasoning-start"),
  id: ContentBlockID,
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type ReasoningStart = Schema.Schema.Type<typeof ReasoningStart>

export const ReasoningDelta = Schema.Struct({
  type: Schema.tag("reasoning-delta"),
  id: ContentBlockID,
  text: Schema.String,
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type ReasoningDelta = Schema.Schema.Type<typeof ReasoningDelta>

export const ReasoningEnd = Schema.Struct({
  type: Schema.tag("reasoning-end"),
  id: ContentBlockID,
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type ReasoningEnd = Schema.Schema.Type<typeof ReasoningEnd>

export const ToolInputStart = Schema.Struct({
  type: Schema.tag("tool-input-start"),
  id: ToolCallID,
  name: Schema.String,
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type ToolInputStart = Schema.Schema.Type<typeof ToolInputStart>

export const ToolInputDelta = Schema.Struct({
  type: Schema.tag("tool-input-delta"),
  id: ToolCallID,
  text: Schema.String,
})
export type ToolInputDelta = Schema.Schema.Type<typeof ToolInputDelta>

export const ToolInputEnd = Schema.Struct({
  type: Schema.tag("tool-input-end"),
  id: ToolCallID,
  name: Schema.String,
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type ToolInputEnd = Schema.Schema.Type<typeof ToolInputEnd>

export const ToolCall_ = Schema.Struct({
  type: Schema.tag("tool-call"),
  id: ToolCallID,
  name: Schema.String,
  input: Schema.Unknown,
  providerExecuted: Schema.optional(Schema.Boolean),
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type ToolCall_ = Schema.Schema.Type<typeof ToolCall_>

export const ToolResult_ = Schema.Struct({
  type: Schema.tag("tool-result"),
  id: ToolCallID,
  name: Schema.String,
  result: Schema.Unknown,
  output: Schema.optional(Schema.String),
  input: Schema.optional(Schema.Unknown),
  error: Schema.optional(Schema.String),
  providerExecuted: Schema.optional(Schema.Boolean),
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type ToolResult_ = Schema.Schema.Type<typeof ToolResult_>

export const ToolError = Schema.Struct({
  type: Schema.tag("tool-error"),
  id: ToolCallID,
  name: Schema.String,
  message: Schema.String,
  error: Schema.optional(Schema.Defect),
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type ToolError = Schema.Schema.Type<typeof ToolError>

export const StepFinish = Schema.Struct({
  type: Schema.tag("step-finish"),
  index: Schema.Number,
  reason: FinishReason,
  usage: Schema.optional(Usage),
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type StepFinish = Schema.Schema.Type<typeof StepFinish>

export const Finish = Schema.Struct({
  type: Schema.tag("finish"),
  reason: FinishReason,
  usage: Schema.optional(Usage),
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type Finish = Schema.Schema.Type<typeof Finish>

export const Intent = Schema.Struct({
  type: Schema.tag("intent"),
  id: ContentBlockID,
  text: Schema.String,
  toolNames: Schema.optional(Schema.Array(Schema.String)),
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type Intent = Schema.Schema.Type<typeof Intent>

export const ProviderErrorEvent = Schema.Struct({
  type: Schema.tag("provider-error"),
  message: Schema.String,
  classification: Schema.optional(ProviderFailureClassification),
  retryable: Schema.optional(Schema.Boolean),
  providerMetadata: Schema.optional(ProviderMetadata),
})
export type ProviderErrorEvent = Schema.Schema.Type<typeof ProviderErrorEvent>

export const UsageEvent = Schema.Struct({
  type: Schema.tag("usage"),
  usage: Usage,
})
export type UsageEvent = Schema.Schema.Type<typeof UsageEvent>

const llmEventSchemas = [
  StepStart,
  Intent,
  TextStart,
  TextDelta,
  TextEnd,
  ReasoningStart,
  ReasoningDelta,
  ReasoningEnd,
  ToolInputStart,
  ToolInputDelta,
  ToolInputEnd,
  ToolCall_,
  ToolResult_,
  ToolError,
  StepFinish,
  Finish,
  ProviderErrorEvent,
  UsageEvent,
] as const

export const LLMEvent = Schema.Union(...llmEventSchemas)
export type LLMEvent = Schema.Schema.Type<typeof LLMEvent>

const isEventType = <T extends { readonly type: string }>(type: string) => (event: any): event is T =>
  event.type === type

export const isStepStart = isEventType<StepStart>("step-start")
export const isIntent = isEventType<Intent>("intent")
export const isTextStart = isEventType<TextStart>("text-start")
export const isTextDelta = isEventType<TextDelta>("text-delta")
export const isTextEnd = isEventType<TextEnd>("text-end")
export const isReasoningStart = isEventType<ReasoningStart>("reasoning-start")
export const isReasoningDelta = isEventType<ReasoningDelta>("reasoning-delta")
export const isReasoningEnd = isEventType<ReasoningEnd>("reasoning-end")
export const isToolInputStart = isEventType<ToolInputStart>("tool-input-start")
export const isToolInputDelta = isEventType<ToolInputDelta>("tool-input-delta")
export const isToolInputEnd = isEventType<ToolInputEnd>("tool-input-end")
export const isToolCall = isEventType<ToolCall_>("tool-call")
export const isToolResult = isEventType<ToolResult_>("tool-result")
export const isToolError = isEventType<ToolError>("tool-error")
export const isStepFinish = isEventType<StepFinish>("step-finish")
export const isFinish = isEventType<Finish>("finish")
export const isProviderError = isEventType<ProviderErrorEvent>("provider-error")
export const isUsageEvent = isEventType<UsageEvent>("usage")
