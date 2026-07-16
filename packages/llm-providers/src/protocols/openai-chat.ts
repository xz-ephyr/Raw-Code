import { Effect, Schema } from "effect"
import { Protocol } from "../route/protocol"
import type {
  LLMEvent,
  LLMRequest,
  ToolCallPart as ToolCallPartMsg,
} from "../schema"
import { Usage, LLMError, InvalidRequestReason } from "../schema"
import type {
  OpenAIChatMessage,
  OpenAIChatContentPart,
  OpenAIChatBody,
  OpenAIStreamEvent,
  OpenAIChatState,
} from "./openai-types"
export type { OpenAIChatBody, OpenAIToolCall, OpenAIToolDefinition, OpenAIStreamChunk } from "./openai-types"
import {
  convertContentPart,
  safeStringify,
  convertSystemParts,
  convertToolDefinition,
  convertToolChoice,
  textStartEvent,
  textStartId,
  textDeltaEvent,
  reasoningStartEvent,
  reasoningStartId,
  reasoningDeltaEvent,
  toolInputStartEvent,
  toolInputStartId,
  toolInputDeltaEvent,
  toolInputEndEvent,
  toolCallEvent,
  stepStartEvent,
  stepFinishEvent,
  finishEvent,
  mapFinishReason,
} from "./openai-converters"

export const OpenAIProtocol = Protocol.make<OpenAIChatBody, string, OpenAIStreamEvent, OpenAIChatState>({
  id: "openai-chat",
  body: {
    schema: Schema.Struct({
      model: Schema.String,
      messages: Schema.Array(Schema.Any as any),
      stream: Schema.Literal(true as const),
      stream_options: Schema.optional(Schema.Struct({ include_usage: Schema.optional(Schema.Boolean) })),
    }) as unknown as Schema.Schema<OpenAIChatBody, unknown>,
    from: (request: LLMRequest) => {
      const build = () => {
        const messages: Array<OpenAIChatMessage> = []

        if (request.system.length > 0) {
          messages.push({ role: "system", content: convertSystemParts(request.system) })
        }

        for (const msg of request.messages) {
          if (msg.role === "system") {
            const text = msg.content.map((p) => (p.type === "text" ? (p as any).text : "")).join("\n")
            messages.push({ role: "system", content: text })
          } else if (msg.role === "user") {
            const parts = msg.content
              .map((p) => convertContentPart(p))
              .filter((p): p is OpenAIChatContentPart => p !== undefined)
            const content = parts.length === 1 && parts[0]?.type === "text"
              ? parts[0].text
              : parts.length > 0 ? parts : ""
            messages.push({ role: "user", content: content as any })
          } else if (msg.role === "assistant") {
            const textParts = msg.content.filter((p) => p.type === "text")
            const toolCallParts = msg.content.filter((p) => p.type === "tool-call") as ToolCallPartMsg[]
            const text = textParts.map((p) => (p as any).text).join("")
            const mc: OpenAIChatMessage = {
              role: "assistant",
              content: text || null,
            }
            if (toolCallParts.length > 0) {
              mc.tool_calls = toolCallParts.map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: { name: tc.name, arguments: JSON.stringify(tc.input) },
              }))
            }
            messages.push(mc)
          } else if (msg.role === "tool") {
            for (const part of msg.content) {
              if (part.type === "tool-result") {
                const val = typeof part.result.value === "string" ? part.result.value : safeStringify(part.result.value)
                messages.push({
                  role: "tool",
                  tool_call_id: part.id,
                  content: val,
                })
              }
            }
          }
        }

        const body: OpenAIChatBody = {
          model: request.model.id,
          messages,
          stream: true,
          stream_options: { include_usage: true },
        }

        if (request.tools.length > 0) {
          body.tools = request.tools.map(convertToolDefinition)
        }

        if (request.toolChoice) {
          body.tool_choice = convertToolChoice(request.toolChoice)
        }

        const gen = request.generation
        if (gen) {
          if (gen.maxTokens !== undefined) body.max_tokens = gen.maxTokens
          if (gen.temperature !== undefined) body.temperature = gen.temperature
          if (gen.topP !== undefined) body.top_p = gen.topP
          if (gen.frequencyPenalty !== undefined) body.frequency_penalty = gen.frequencyPenalty
          if (gen.presencePenalty !== undefined) body.presence_penalty = gen.presencePenalty
          if (gen.seed !== undefined) body.seed = gen.seed
          if (gen.stop !== undefined) body.stop = gen.stop.length === 1 ? gen.stop[0] : gen.stop
        }

        const responseFormat = request.responseFormat
        if (responseFormat) {
          if (responseFormat.type === "json" && responseFormat.schema) {
            body.response_format = {
              type: "json_schema",
              json_schema: { name: "response", schema: responseFormat.schema as any, strict: true },
            }
          } else if (responseFormat.type === "json") {
            body.response_format = { type: "json_object" }
          } else if (responseFormat.type === "tool" && responseFormat.tool) {
            body.tool_choice = { type: "function", function: { name: responseFormat.tool.name } }
          }
        }

        const providerOptions = request.providerOptions?.openai as Record<string, unknown> | undefined
        if (providerOptions) {
          if (typeof providerOptions.reasoning_effort === "string") {
            body.reasoning_effort = providerOptions.reasoning_effort
          }
          if (typeof providerOptions.user === "string") {
            body.user = providerOptions.user
          }
          if (providerOptions.metadata && typeof providerOptions.metadata === "object") {
            body.metadata = providerOptions.metadata as Record<string, unknown>
          }
        }

        return body
      }
      return Effect.try({
        try: build,
        catch: (error) => new LLMError({
          module: "OpenAIChatProtocol",
          method: "from",
          reason: new InvalidRequestReason({
            message: error instanceof Error ? error.message : String(error),
          }),
        }) as LLMError,
      })
    },
  },
  stream: {
    event: Schema.parseJson(Schema.Unknown).pipe(
      Schema.transformOrFail(Schema.Any as Schema.Schema<OpenAIStreamEvent, unknown>,
        {
          strict: false,
          decode: (u) => Effect.succeed(u as OpenAIStreamEvent),
          encode: (u) => Effect.succeed(u),
        },
      ),
    ),
    initial: (): OpenAIChatState => ({
      textBlocks: {},
      reasoningBlocks: {},
      toolCalls: {},
    }),
    step: (state: OpenAIChatState, event: OpenAIStreamEvent) =>
      Effect.gen(function* () {
        const events: Array<LLMEvent> = []
        const choice = event.choices[0]
        if (!choice) return [state, events] as const

        const index = choice.index
        const delta = choice.delta

        if (delta.content !== undefined && delta.content !== null) {
          const key = textStartId(index)
          const existing = state.textBlocks[key]
          if (!existing) {
            events.push(stepStartEvent(index))
            events.push(textStartEvent(key))
          }
          events.push(textDeltaEvent(key, delta.content))
        }

        if (delta.reasoning_content !== undefined && delta.reasoning_content !== null) {
          const key = reasoningStartId(index)
          const existing = state.reasoningBlocks[key]
          if (!existing) {
            events.push(reasoningStartEvent(key))
          }
          events.push(reasoningDeltaEvent(key, delta.reasoning_content))
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const key = toolInputStartId(index, tc.index)
            const existing = state.toolCalls[key]
            if (!existing && tc.id && tc.function?.name) {
              events.push(toolInputStartEvent(key, tc.function.name))
            }
            if (tc.function?.arguments) {
              events.push(toolInputDeltaEvent(key, tc.function?.name ?? "", tc.function.arguments))
            }
            if (tc.function?.arguments && tc.id && tc.function?.name) {
              try {
                const parsed = JSON.parse(tc.function.arguments)
                events.push(toolInputEndEvent(key, tc.function.name))
                events.push(toolCallEvent(tc.id, tc.function.name, parsed))
              } catch {
                // partial JSON, continue accumulating
              }
            }
          }
        }

        if (choice.finish_reason) {
          const reason = mapFinishReason(choice.finish_reason)
          if (event.usage) {
            const usage = new Usage({
              inputTokens: event.usage.prompt_tokens,
              outputTokens: event.usage.completion_tokens,
              totalTokens: event.usage.total_tokens,
              reasoningTokens: event.usage.completion_tokens_details?.reasoning_tokens,
            })
            events.push(stepFinishEvent(index, reason, usage))
            events.push(finishEvent(reason, usage))
          } else {
            events.push(stepFinishEvent(index, reason))
            events.push(finishEvent(reason))
          }
        }

        return [state, events] as const
      }),
    terminal: (event: OpenAIStreamEvent) => event.choices[0]?.finish_reason !== null,
    onHalt: (state: OpenAIChatState) => {
      const events: Array<LLMEvent> = []
      for (const [key, tc] of Object.entries(state.toolCalls)) {
        const entry = tc as { readonly name: string; readonly args: string; readonly index: number }
        if (entry.args) {
          try {
            const parsed = JSON.parse(entry.args)
            events.push(toolCallEvent(key, entry.name, parsed))
          } catch {
            // ignore partial tool calls on halt
          }
        }
      }
      const finish = events.length > 0
        ? finishEvent("tool-calls" as any)
        : finishEvent("stop" as any)
      events.push(finish)
      return events
    },
  },
})
