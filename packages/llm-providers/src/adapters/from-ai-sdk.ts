import { Stream, Effect } from "effect"
import { streamText } from "ai"
import type { LLMEvent } from "../schema/event-schemas"
import { ToolResultValue } from "../schema/messages"

type StreamTextResult = Awaited<ReturnType<typeof streamText>>
type AISDKEvent = StreamTextResult["fullStream"] extends AsyncIterable<infer T> ? T : never

interface AdapterState {
  step: number
  textBlock: number
  reasoningBlock: number
  currentTextID: string | undefined
  currentReasoningID: string | undefined
  toolNames: Record<string, string>
}

function adapterState(): AdapterState {
  return {
    step: 0,
    textBlock: 0,
    reasoningBlock: 0,
    currentTextID: undefined,
    currentReasoningID: undefined,
    toolNames: {},
  }
}

function currentTextID(state: AdapterState, id: string | undefined): string {
  state.currentTextID = id ?? state.currentTextID ?? `text-${state.textBlock++}`
  return state.currentTextID
}

function currentReasoningID(state: AdapterState, id: string | undefined): string {
  state.currentReasoningID = id ?? state.currentReasoningID ?? `reasoning-${state.reasoningBlock++}`
  return state.currentReasoningID
}

const FINISH_REASONS = new Set(["stop", "length", "tool-calls", "content-filter", "error", "unknown"])

function finishReason(value: string | undefined): string {
  if (!value || !FINISH_REASONS.has(value)) return "unknown"
  return value
}

function providerMetadata(value: unknown): Record<string, unknown> | undefined {
  if (value == null || typeof value !== "object") return undefined
  return value as Record<string, unknown>
}

const USAGE_KEYS = [
  "inputTokens", "outputTokens", "totalTokens",
  "reasoningTokens", "cacheReadInputTokens", "cacheWriteInputTokens",
] as const

function usage(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== "object") return undefined
  const item = value as Record<string, number | undefined>
  const result: Record<string, number> = {}
  for (const key of USAGE_KEYS) {
    const v = item[key]
    if (typeof v === "number") result[key] = v
  }
  return Object.keys(result).length === 0 ? undefined : result
}

function toLLMEvent(event: AISDKEvent, state: AdapterState): Effect.Effect<readonly LLMEvent[], never> {
  switch (event.type) {
    case "start":
      return Effect.succeed([])

    case "start-step":
      return Effect.succeed([{ type: "step-start", index: state.step }] as unknown as LLMEvent[])

    case "finish-step": {
      const e = event as Extract<AISDKEvent, { type: "finish-step" }>
      return Effect.sync(() => [
        {
          type: "step-finish",
          index: state.step++,
          reason: finishReason(e.finishReason),
          usage: usage(e.usage),
          providerMetadata: providerMetadata(e.providerMetadata),
        },
      ] as unknown as LLMEvent[])
    }

    case "finish": {
      const e = event as Extract<AISDKEvent, { type: "finish" }>
      return Effect.sync(() => [
        {
          type: "finish",
          reason: finishReason(e.finishReason),
          usage: usage(e.totalUsage),
        },
      ] as unknown as LLMEvent[])
    }

    case "text-start": {
      const e = event as Extract<AISDKEvent, { type: "text-start" }>
      state.currentTextID = currentTextID(state, e.id)
      return Effect.succeed([
        { type: "text-start", id: state.currentTextID, providerMetadata: providerMetadata(e.providerMetadata) },
      ] as unknown as LLMEvent[])
    }

    case "text-delta": {
      const e = event as Extract<AISDKEvent, { type: "text-delta" }>
      return Effect.succeed([
        { type: "text-delta", id: currentTextID(state, e.id), text: e.text, providerMetadata: providerMetadata(e.providerMetadata) },
      ] as unknown as LLMEvent[])
    }

    case "text-end": {
      const e = event as Extract<AISDKEvent, { type: "text-end" }>
      const id = currentTextID(state, e.id)
      state.currentTextID = undefined
      return Effect.succeed([
        { type: "text-end", id, providerMetadata: providerMetadata(e.providerMetadata) },
      ] as unknown as LLMEvent[])
    }

    case "reasoning-start": {
      const e = event as Extract<AISDKEvent, { type: "reasoning-start" }>
      state.currentReasoningID = currentReasoningID(state, e.id)
      return Effect.succeed([
        { type: "reasoning-start", id: state.currentReasoningID, providerMetadata: providerMetadata(e.providerMetadata) },
      ] as unknown as LLMEvent[])
    }

    case "reasoning-delta": {
      const e = event as Extract<AISDKEvent, { type: "reasoning-delta" }>
      return Effect.succeed([
        { type: "reasoning-delta", id: currentReasoningID(state, e.id), text: e.text, providerMetadata: providerMetadata(e.providerMetadata) },
      ] as unknown as LLMEvent[])
    }

    case "reasoning-end": {
      const e = event as Extract<AISDKEvent, { type: "reasoning-end" }>
      const id = currentReasoningID(state, e.id)
      state.currentReasoningID = undefined
      return Effect.succeed([
        { type: "reasoning-end", id, providerMetadata: providerMetadata(e.providerMetadata) },
      ] as unknown as LLMEvent[])
    }

    case "tool-input-start": {
      const e = event as Extract<AISDKEvent, { type: "tool-input-start" }>
      state.toolNames[e.id] = e.toolName
      return Effect.succeed([
        { type: "tool-input-start", id: e.id, name: e.toolName, providerMetadata: providerMetadata(e.providerMetadata) },
      ] as unknown as LLMEvent[])
    }

    case "tool-input-delta": {
      const e = event as Extract<AISDKEvent, { type: "tool-input-delta" }>
      return Effect.succeed([
        { type: "tool-input-delta", id: e.id, name: state.toolNames[e.id] ?? "unknown", text: e.delta },
      ] as unknown as LLMEvent[])
    }

    case "tool-input-end": {
      const e = event as Extract<AISDKEvent, { type: "tool-input-end" }>
      return Effect.succeed([
        { type: "tool-input-end", id: e.id, name: state.toolNames[e.id] ?? "unknown", providerMetadata: providerMetadata(e.providerMetadata) },
      ] as unknown as LLMEvent[])
    }

    case "tool-call": {
      const e = event as Extract<AISDKEvent, { type: "tool-call" }>
      state.toolNames[e.toolCallId] = e.toolName
      return Effect.succeed([
        {
          type: "tool-call",
          id: e.toolCallId,
          name: e.toolName,
          input: e.input,
          providerExecuted: "providerExecuted" in e ? e.providerExecuted : undefined,
          providerMetadata: providerMetadata(e.providerMetadata),
        },
      ] as unknown as LLMEvent[])
    }

    case "tool-result": {
      const e = event as Extract<AISDKEvent, { type: "tool-result" }>
      const name = state.toolNames[e.toolCallId] ?? e.toolName
      delete state.toolNames[e.toolCallId]
      return Effect.succeed([
        {
          type: "tool-result",
          id: e.toolCallId,
          name,
          result: ToolResultValue.make(e.output),
          providerExecuted: "providerExecuted" in e ? e.providerExecuted : undefined,
          providerMetadata: providerMetadata(e.providerMetadata),
        },
      ] as unknown as LLMEvent[])
    }

    case "tool-error": {
      const e = event as Extract<AISDKEvent, { type: "tool-error" }>
      const name = state.toolNames[e.toolCallId] ?? e.toolName
      delete state.toolNames[e.toolCallId]
      return Effect.succeed([
        {
          type: "tool-error",
          id: e.toolCallId,
          name,
          message: e.error instanceof Error ? e.error.message : String(e.error),
          error: e.error,
          providerMetadata: providerMetadata(e.providerMetadata),
        },
      ] as unknown as LLMEvent[])
    }

    case "error":
      return Effect.sync(() => [
        { type: "provider-error", message: event.error instanceof Error ? event.error.message : String(event.error) },
      ] as unknown as LLMEvent[])

    case "abort":
    case "source":
    case "file":
    case "tool-output-denied":
    case "tool-approval-request":
      return Effect.succeed([])

    case "raw":
      return Effect.succeed([])

    default: {
      const _exhaustive: never = event
      void _exhaustive
      return Effect.succeed([])
    }
  }
}

export function toLLMEvents(
  result: StreamTextResult,
): Stream.Stream<LLMEvent, Error> {
  const state = adapterState()
  return Stream.fromAsyncIterable(result.fullStream, (e) =>
    e instanceof Error ? e : new Error(String(e)),
  ).pipe(
    Stream.mapEffect((event) => toLLMEvent(event, state)),
    Stream.flatMap((events) => Stream.fromIterable(events)),
  )
}
