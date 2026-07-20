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
  intentEvent,
} from "./openai-converters"

/**
 * Parses inline text function calls emitted by models that don't support
 * native tool_calls. Two observed shapes:
 *   1. <function name="web_search">{"query": "x"}</function>   (clean, valid JSON)
 *   2. <function(web_search){\query\ \Elon Musk net worth\ \maxResults\ \5\}</function>
 *      (Groq-style: name in parens, args as backslash-delimited tokens)
 * Returns the leftover plain text plus normalized calls (name + raw args +
 * best-effort parsed object).
 */
function parseInlineFunctionCalls(content: string): {
  remaining: string
  calls: Array<{ name: string; args: string; parsed: unknown }>
} {
  const calls: Array<{ name: string; args: string; parsed: unknown }> = []
  // Name may appear as: (web_search), \web_search, name="web_search", or just
  // web_search. Args follow, either as {…} (Groq style) or >…</function> (clean).
  const re = /<function\s*(?:name=(?:"([^"]*)"|'([^']*)')|[(\\\s]?\s*([A-Za-z0-9_-]+)[)\\]?)\s*([\s\S]*?)<\/function>/gi
  let remaining = content
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) {
    const name = match[1] ?? match[2] ?? match[3] ?? ""
    const body = match[4] ?? ""
    if (!name) continue
    // Pull the {...} args block if present; otherwise use the body (minus a
    // leading '>' from the clean style) as the args string.
    const braceMatch = /\{[\s\S]*\}/.exec(body)
    const args = braceMatch ? braceMatch[0] : body.replace(/^>\s*/, "")
    const parsed = parseInlineArgs(args)
    calls.push({ name, args, parsed })
    remaining = remaining.replace(match[0], "")
  }
  return { remaining: remaining.trim() === content.trim() ? content : remaining, calls }
}

/**
 * Best-effort parser for inline tool-call arguments. Tries strict JSON first,
 * then falls back to the Groq backslash-delimited token form
 * ({\key\ \value with spaces\ \key2\ \value2\}), pairing tokens into an object.
 */
function parseInlineArgs(args: string): unknown {
  const trimmed = args.trim()
  if (!trimmed) return {}
  try {
    return JSON.parse(trimmed)
  } catch {
    // ignore and try tolerant parse
  }

  // Tolerant: Groq emits args as {\key\ \value with spaces\ \key2\ \value2\}
  // — tokens are wrapped in backslashes and separated by spaces. Split on the
  // backslash boundaries and pair alternating key/value segments. If that
  // doesn't yield an even set, fall back to returning the raw args string.
  const segments = trimmed.split("\\").map((s) => s.trim()).filter((s) => s.length > 0)
  const tokens: string[] = []
  for (const seg of segments) {
    let tok = seg
    if (tok.startsWith("{")) tok = tok.slice(1).trim()
    if (tok.endsWith("}")) tok = tok.slice(0, -1).trim()
    if (tok.length > 0) tokens.push(tok)
  }
  if (tokens.length >= 2 && tokens.length % 2 === 0) {
    const obj: Record<string, unknown> = {}
    for (let i = 0; i < tokens.length; i += 2) {
      const key = tokens[i]
      let val: unknown = tokens[i + 1]
      if (typeof val === "string" && val !== "" && !isNaN(Number(val))) val = Number(val)
      obj[key] = val
    }
    return obj
  }

  return args
}

/**
 * Computes a synthetic tool-call index for inline (text) function calls that
 * doesn't collide with real delta.tool_calls indices already in state.
 */
function nextToolCallIndex(
  toolCalls: Record<string, unknown>,
  emitted: ReadonlyArray<string>,
): number {
  let max = -1
  for (const key of [...Object.keys(toolCalls), ...emitted]) {
    const m = /tool:\d+:(\d+)$/.exec(key)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

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
      intentEmitted: false,
      intentText: "",
      toolNames: [],
      toolCallsEmitted: [],
    }),
    step: (state: OpenAIChatState, event: OpenAIStreamEvent) =>
      Effect.gen(function* () {
        const events: Array<LLMEvent> = []
        const choice = event.choices?.[0]
        if (!choice) return [state, events] as const

        const index = choice.index
        const delta = choice.delta

        const newTextBlocks = { ...state.textBlocks }
        const newReasoningBlocks = { ...state.reasoningBlocks }
        const newToolCalls = { ...state.toolCalls }
        let newIntentEmitted = state.intentEmitted
        let newIntentText = state.intentText
        const newToolNames = [...state.toolNames]
        let newToolCallsEmitted = [...state.toolCallsEmitted]

        // Track tool names as they appear
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.function?.name && !newToolNames.includes(tc.function.name)) {
              newToolNames.push(tc.function.name)
            }
          }
        }

        if (delta.content !== undefined && delta.content !== null) {
          // Some models (e.g. Groq llama) emit tool calls as inline text of the
          // form <function name="x">args</function> instead of native tool_calls
          // deltas. Detect and convert those into proper tool-call events so the
          // tool loop still executes them; the marker text is stripped from the
          // forwarded content so it isn't shown as prose.
          const parsed = parseInlineFunctionCalls(delta.content)
          const plainContent = parsed.remaining

          if (parsed.calls.length > 0) {
            for (const call of parsed.calls) {
              if (!newToolNames.includes(call.name)) newToolNames.push(call.name)
              const tcIndex = nextToolCallIndex(newToolCalls, newToolCallsEmitted)
              const key = toolInputStartId(index, tcIndex)
              newToolCalls[key] = { name: call.name, args: call.args, index: tcIndex }
              newToolCallsEmitted.push(key)
              events.push(toolInputStartEvent(key, call.name))
              if (call.args) events.push(toolInputDeltaEvent(key, call.args))
              events.push(toolInputEndEvent(key, call.name))
              events.push(toolCallEvent(key, call.name, call.parsed))
              if (!state.intentEmitted) {
                newIntentEmitted = true
                newIntentText = `Using ${call.name} tool...`
                const intentId = `intent:${index}:${Date.now()}`
                events.push(intentEvent(intentId, newIntentText, newToolNames.length > 0 ? newToolNames : undefined))
              }
            }
          }

          if (plainContent.length > 0) {
            const key = textStartId(index)
            const existing = newTextBlocks[key]
            if (!existing) {
              newTextBlocks[key] = { index, text: plainContent }
              events.push(stepStartEvent(index))
              events.push(textStartEvent(key))

              // Emit intent on first text chunk (before tool calls)
              if (!state.intentEmitted && !delta.tool_calls && parsed.calls.length === 0) {
                newIntentEmitted = true
                newIntentText = plainContent
                const intentId = `intent:${index}:${Date.now()}`
                events.push(intentEvent(intentId, plainContent, newToolNames.length > 0 ? newToolNames : undefined))
              }
            } else {
              newTextBlocks[key] = { ...existing, text: existing.text + plainContent }
            }
            events.push(textDeltaEvent(key, plainContent))
          }
        }

        if (delta.reasoning_content !== undefined && delta.reasoning_content !== null) {
          const key = reasoningStartId(index)
          const existing = newReasoningBlocks[key]
          if (!existing) {
            newReasoningBlocks[key] = { index, text: delta.reasoning_content }
            events.push(reasoningStartEvent(key))
          } else {
            newReasoningBlocks[key] = { ...existing, text: existing.text + delta.reasoning_content }
          }
          events.push(reasoningDeltaEvent(key, delta.reasoning_content))
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const key = toolInputStartId(index, tc.index)
            const existing = newToolCalls[key]
            if (!existing && tc.id && tc.function?.name) {
              newToolCalls[key] = { name: tc.function.name, args: tc.function.arguments ?? "", index: tc.index }
              newToolCallsEmitted.push(key)
              events.push(toolInputStartEvent(key, tc.function.name))
              if (tc.function.arguments) {
                events.push(toolInputDeltaEvent(key, tc.function.arguments))
              }
              // Emit intent on first tool call if not already emitted
              if (!state.intentEmitted) {
                newIntentEmitted = true
                newIntentText = `Using ${tc.function.name} tool...`
                const intentId = `intent:${index}:${Date.now()}`
                events.push(intentEvent(intentId, `Using ${tc.function.name} tool...`, newToolNames.length > 0 ? newToolNames : undefined))
              }
            } else if (existing && tc.function?.arguments) {
              newToolCalls[key] = { ...existing, args: existing.args + tc.function.arguments }
              events.push(toolInputDeltaEvent(key, tc.function.arguments))
            }
          }
        }

        if (choice.finish_reason) {
          for (const key of Object.keys(newTextBlocks)) {
            events.push({ type: "text-end", id: key } as any)
          }
          for (const key of Object.keys(newReasoningBlocks)) {
            events.push({ type: "reasoning-end", id: key } as any)
          }
          for (const [key, tc] of Object.entries(newToolCalls)) {
            if (newToolCallsEmitted.includes(key)) continue
            const entry = tc as { name: string; args: string; index: number }
            if (entry.args) {
              let parsed: unknown
              try {
                parsed = JSON.parse(entry.args)
              } catch {
                parsed = entry.args
              }
              events.push(toolInputEndEvent(key, entry.name))
              events.push(toolCallEvent(key, entry.name, parsed))
            }
          }

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

        return [{ 
          textBlocks: newTextBlocks, 
          reasoningBlocks: newReasoningBlocks, 
          toolCalls: newToolCalls,
          intentEmitted: newIntentEmitted,
          intentText: newIntentText,
          toolNames: newToolNames,
          toolCallsEmitted: newToolCallsEmitted,
        }, events] as const
      }),
    terminal: (event: OpenAIStreamEvent) => event.choices?.[0]?.finish_reason != null,
    onHalt: (state: OpenAIChatState) => {
      const events: Array<LLMEvent> = []
      for (const key of Object.keys(state.textBlocks)) {
        events.push({ type: "text-end", id: key } as any)
      }
      for (const key of Object.keys(state.reasoningBlocks)) {
        events.push({ type: "reasoning-end", id: key } as any)
      }
      for (const [key, tc] of Object.entries(state.toolCalls)) {
        const entry = tc as { readonly name: string; readonly args: string; readonly index: number }
        let parsed: unknown
        if (entry.args) {
          try {
            parsed = JSON.parse(entry.args)
          } catch {
            parsed = entry.args
          }
        }
        events.push(toolInputEndEvent(key, entry.name))
        events.push(toolCallEvent(key, entry.name, parsed ?? {}))
      }
      const finish = events.length > 0
        ? finishEvent("tool-calls" as any)
        : finishEvent("stop" as any)
      events.push(finish)
      return events
    },
  },
})
