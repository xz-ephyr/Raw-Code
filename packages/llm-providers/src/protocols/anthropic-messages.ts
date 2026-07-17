import { Effect, Schema } from "effect"
import { Protocol } from "../route/protocol"
import type {
  LLMEvent,
  LLMRequest,
  ToolCallPart as ToolCallPartMsg,
  ToolDefinition,
} from "../schema"
import { Usage, LLMError, InvalidRequestReason } from "../schema"

export interface AnthropicSystemBlock {
  type: "text"
  text: string
  cache_control?: { type: "ephemeral" }
}

export interface AnthropicMessage {
  role: "user" | "assistant"
  content: string | ReadonlyArray<AnthropicContentBlock>
}

export type AnthropicContentBlock =
  | { type: "text"; text: string; cache_control?: { type: "ephemeral" } }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string | ReadonlyArray<{ type: "text"; text: string }>; is_error?: boolean }

export type AnthropicBody = {
  model: string
  max_tokens: number
  system?: string | ReadonlyArray<AnthropicSystemBlock>
  messages: ReadonlyArray<AnthropicMessage>
  stream: true
  tools?: ReadonlyArray<AnthropicToolDefinition>
  tool_choice?: { type: "auto" | "any" | "tool"; name?: string }
  metadata?: { user_id?: string }
  stop_sequences?: ReadonlyArray<string>
  temperature?: number
  top_p?: number
  top_k?: number
}

export interface AnthropicToolDefinition {
  name: string
  description: string
  input_schema: Record<string, unknown>
  cache_control?: { type: "ephemeral" }
}

export type AnthropicStreamEvent =
  | { type: "message_start"; message: { id: string; model: string; usage: { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number } } }
  | { type: "content_block_start"; index: number; content_block: { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: unknown } }
  | { type: "content_block_delta"; index: number; delta: { type: "text_delta"; text: string } | { type: "input_json_delta"; partial_json: string } | { type: "thinking_delta"; thinking: string } | { type: "signature_delta"; signature: string } }
  | { type: "content_block_stop"; index: number }
  | { type: "message_delta"; delta: { stop_reason: string; stop_sequence: string | null }; usage: { output_tokens: number } }
  | { type: "message_stop" }
  | { type: "ping" }

export interface AnthropicState {
  readonly textBlocks: Readonly<Record<string, { readonly index: number; readonly text: string }>>
  readonly thinkingBlocks: Readonly<Record<string, { readonly index: number; readonly text: string }>>
  readonly toolInputs: Readonly<Record<string, { readonly name: string; readonly json: string }>>
  readonly inputTokens?: number
  readonly cacheCreationTokens?: number
  readonly cacheReadTokens?: number
  readonly outputTokens?: number
}

const safeStringify = (value: unknown): string => {
  try { return JSON.stringify(value) } catch { return String(value) }
}

const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

const convertToolDefinition = (tool: ToolDefinition): AnthropicToolDefinition => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.inputSchema as Record<string, unknown>,
})

const textStartEvent = (id: string): LLMEvent => ({ type: "text-start", id } as any)
const textStartId = (index: number) => `text:${index}`
const textDeltaEvent = (id: string, text: string): LLMEvent => ({ type: "text-delta", id, text } as any)
const textEndEvent = (id: string): LLMEvent => ({ type: "text-end", id } as any)
const reasoningDeltaEvent = (id: string, text: string): LLMEvent => ({ type: "reasoning-delta", id, text } as any)
const toolInputStartEvent = (id: string, name: string): LLMEvent => ({ type: "tool-input-start", id, name } as any)
const toolInputStartId = (index: number) => `tool:${index}`
const toolInputDeltaEvent = (id: string, text: string): LLMEvent => ({ type: "tool-input-delta", id, text } as any)
const toolInputEndEvent = (id: string, name: string): LLMEvent => ({ type: "tool-input-end", id, name } as any)
const toolCallEvent = (id: string, name: string, input: unknown): LLMEvent => ({ type: "tool-call", id, name, input } as any)
const stepStartEvent = (index: number): LLMEvent => ({ type: "step-start", index } as any)
const stepFinishEvent = (index: number, reason: any, usage?: Usage): LLMEvent => ({ type: "step-finish", index, reason, ...(usage ? { usage } : {}) } as any)
const finishEvent = (reason: any, usage?: Usage): LLMEvent => ({ type: "finish", reason, ...(usage ? { usage } : {}) } as any)

export const AnthropicProtocol = Protocol.make<AnthropicBody, string, AnthropicStreamEvent, AnthropicState>({
  id: "anthropic-messages",
  body: {
    schema: Schema.Struct({
      model: Schema.String,
      max_tokens: Schema.Number,
      messages: Schema.Array(Schema.Any as any),
      stream: Schema.Literal(true as const),
      system: Schema.optional(Schema.String),
    }) as unknown as Schema.Schema<AnthropicBody, unknown>,
    from: (request: LLMRequest) => {
      const build = () => {
        const systemText = request.system.map((s) => s.text).join("\n")
        const system: ReadonlyArray<AnthropicSystemBlock> | undefined = systemText
          ? [{ type: "text" as const, text: systemText }]
          : undefined

        const messages: Array<AnthropicMessage> = []

        for (const msg of request.messages) {
          if (msg.role === "system") {
            const text = msg.content.map((p) => (p.type === "text" ? (p as any).text : "")).join("\n")
            messages.push({ role: "user", content: text })
          } else if (msg.role === "user") {
            const blocks: Array<AnthropicContentBlock> = []
            for (const part of msg.content) {
              if (part.type === "text") {
                blocks.push({ type: "text", text: (part as any).text })
              } else if (part.type === "media") {
                if (typeof part.mediaType === "string" && part.mediaType.startsWith("image/")) {
                  blocks.push({
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: part.mediaType,
                      data: typeof part.data === "string" ? part.data : "",
                    },
                  })
                }
              }
            }
            messages.push({ role: "user", content: blocks.length === 0 ? "" : blocks.length === 1 && blocks[0]?.type === "text" ? blocks[0].text : blocks })
          } else if (msg.role === "assistant") {
            const blocks: Array<AnthropicContentBlock> = []
            for (const part of msg.content) {
              if (part.type === "text") {
                blocks.push({ type: "text", text: (part as any).text })
              } else if (part.type === "tool-call") {
                const tc = part as ToolCallPartMsg
                blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.input })
              }
            }
            messages.push({ role: "assistant", content: blocks.length === 0 ? "" : blocks })
          } else if (msg.role === "tool") {
            const blocks: Array<AnthropicContentBlock> = []
            for (const part of msg.content) {
              if (part.type === "tool-result") {
                const text = typeof part.result.value === "string"
                  ? part.result.value
                  : safeStringify(part.result.value)
                blocks.push({
                  type: "tool_result",
                  tool_use_id: part.id,
                  content: text,
                  is_error: part.result.type === "error",
                })
              }
            }
            if (blocks.length > 0) {
              messages.push({ role: "user", content: blocks })
            }
          }
        }

        const body: AnthropicBody = {
          model: request.model.id,
          max_tokens: request.generation?.maxTokens ?? 4096,
          messages,
          stream: true,
        }

        if (system) {
          body.system = system
        }

        if (request.tools.length > 0) {
          body.tools = request.tools.map(convertToolDefinition)
        }

        if (request.toolChoice) {
          const tc = request.toolChoice as any
          if (tc.type === "auto") body.tool_choice = { type: "auto" }
          else if (tc.type === "required") body.tool_choice = { type: "any" }
          else if (tc.type === "tool" && tc.name) body.tool_choice = { type: "tool", name: tc.name }
          else body.tool_choice = { type: "auto" }
        }

        const gen = request.generation
        if (gen) {
          if (gen.temperature !== undefined) body.temperature = gen.temperature
          if (gen.topP !== undefined) body.top_p = gen.topP
          if (gen.topK !== undefined) body.top_k = gen.topK
          if (gen.stop !== undefined) body.stop_sequences = gen.stop
        }

        return body
      }
      return Effect.try({
        try: build,
        catch: (error) => new LLMError({
          module: "AnthropicMessagesProtocol",
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
      Schema.transformOrFail(Schema.Any as Schema.Schema<AnthropicStreamEvent, unknown>,
        {
          strict: false,
          decode: (u) => Effect.succeed(u as AnthropicStreamEvent),
          encode: (u) => Effect.succeed(u),
        },
      ),
    ),
    initial: (): AnthropicState => ({
      textBlocks: {},
      thinkingBlocks: {},
      toolInputs: {},
    }),
    step: (state: AnthropicState, event: AnthropicStreamEvent) =>
      Effect.gen(function* () {
        const events: Array<LLMEvent> = []
        let next = state

        switch (event.type) {
          case "message_start": {
            events.push(stepStartEvent(0))
            next = {
              ...state,
              inputTokens: event.message.usage.input_tokens,
              cacheCreationTokens: event.message.usage.cache_creation_input_tokens,
              cacheReadTokens: event.message.usage.cache_read_input_tokens,
            }
            break
          }

          case "content_block_start": {
            const { index, content_block } = event
            if (content_block.type === "text") {
              const key = textStartId(index)
              events.push(textStartEvent(key))
              next = {
                ...state,
                textBlocks: { ...state.textBlocks, [key]: { index, text: "" } },
              }
            } else if (content_block.type === "tool_use") {
              const key = toolInputStartId(index)
              events.push(toolInputStartEvent(key, content_block.name))
              next = {
                ...state,
                toolInputs: {
                  ...state.toolInputs,
                  [key]: { name: content_block.name, json: "" },
                },
              }
            }
            break
          }

          case "content_block_delta": {
            const { index, delta } = event
            if (delta.type === "text_delta") {
              const key = textStartId(index)
              events.push(textDeltaEvent(key, delta.text))
              const existing = state.textBlocks[key]
              if (existing) {
                next = {
                  ...state,
                  textBlocks: {
                    ...state.textBlocks,
                    [key]: { ...existing, text: existing.text + delta.text },
                  },
                }
              }
            } else if (delta.type === "input_json_delta") {
              const key = toolInputStartId(index)
              events.push(toolInputDeltaEvent(key, delta.partial_json))
              const existing = state.toolInputs[key]
              if (existing) {
                next = {
                  ...state,
                  toolInputs: {
                    ...state.toolInputs,
                    [key]: { ...existing, json: existing.json + delta.partial_json },
                  },
                }
              }
            } else if (delta.type === "thinking_delta") {
              const key = `thinking:${index}`
              events.push(reasoningDeltaEvent(key, delta.thinking))
              const existing = state.thinkingBlocks[key]
              if (existing) {
                next = {
                  ...state,
                  thinkingBlocks: {
                    ...state.thinkingBlocks,
                    [key]: { ...existing, text: existing.text + delta.thinking },
                  },
                }
              } else {
                next = {
                  ...state,
                  thinkingBlocks: {
                    ...state.thinkingBlocks,
                    [key]: { index, text: delta.thinking },
                  },
                }
              }
            }
            break
          }

          case "content_block_stop": {
            const { index } = event
            const textKey = textStartId(index)
            if (state.textBlocks[textKey]) {
              events.push(textEndEvent(textKey))
            }
            const toolKey = toolInputStartId(index)
            const toolInput = state.toolInputs[toolKey]
            if (toolInput) {
              const parsed = safeJsonParse(toolInput.json)
              events.push(toolInputEndEvent(toolKey, toolInput.name))
              events.push(toolCallEvent(toolKey, toolInput.name, parsed ?? toolInput.json))
            }
            break
          }

          case "message_delta": {
            const reason = mapAnthropicStopReason(event.delta.stop_reason)
            const usage = new Usage({
              outputTokens: event.usage.output_tokens,
              inputTokens: state.inputTokens,
              cacheReadInputTokens: state.cacheReadTokens,
              cacheWriteInputTokens: state.cacheCreationTokens,
            })
            events.push(stepFinishEvent(0, reason, usage))
            events.push(finishEvent(reason, usage))
            break
          }

          case "message_stop":
          case "ping":
            break
        }

        return [next, events] as const
      }),
    terminal: (event: AnthropicStreamEvent) => event.type === "message_stop",
    onHalt: () => [finishEvent("stop" as any)],
  },
})

function mapAnthropicStopReason(reason: string): any {
  switch (reason) {
    case "end_turn": return "stop"
    case "max_tokens": return "length"
    case "stop_sequence": return "stop"
    case "tool_use": return "tool-calls"
    default: return "unknown"
  }
}
