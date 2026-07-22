import { Stream, Effect, Layer } from "effect"
import { Service as LLMClient, layer as llmClientLayer } from "../route/client"
import { withRetry } from "./with-retry"
import type { AnyRoute, Interface as LLMClientInterface } from "../route/client"
import { LLMEvent } from "../schema/event-schemas"
import type { ToolCall_, ToolResult_ } from "../schema/event-schemas"
import { smoothStream, type SmoothConfig } from "./smooth"
import {
  LLMRequest,
  updateLLMRequest,
  assistantMessage,
  toolMessage,
  ToolCallPart,
  ToolResultPart,
} from "../schema/messages"

export interface ToolCallInput {
  readonly id: string
  readonly name: string
  readonly input: unknown
}

export interface ToolResultOutput {
  readonly id: string
  readonly name: string
  readonly result: unknown
}

export type ToolExecutor = (
  input: ToolCallInput,
) => Effect.Effect<ToolResultOutput, Error>

export interface ToolLoopConfig {
  readonly routes: ReadonlyArray<AnyRoute>
  readonly maxSteps?: number
  readonly maxTokens?: number
  readonly timeoutMs?: number
  readonly abortSignal?: AbortSignal
  readonly layer?: Layer.Layer<LLMClientInterface, never, never>
  readonly smooth?: boolean | Partial<SmoothConfig>
}

function describeError(err: unknown): string {
  if (typeof err === 'string') return err
  if (err instanceof Error) {
    if (err.message && err.message !== '[object Object]') return err.message
    const anyErr = err as any
    const rm = anyErr?.reason?.message ?? anyErr?.reason?.reason?.message
    if (typeof rm === 'string' && rm !== '[object Object]') return rm
  }
  const json = JSON.stringify(err)
  if (json && json !== '{}' && json !== '[object Object]') return json
  return String(err)
}

function makeAbortEffect(signal: AbortSignal): Effect.Effect<never, never> {
  return Effect.async<never, never>((emit) => {
    if (signal.aborted) return emit(Effect.die(new DOMException("Aborted", "AbortError")))
    signal.addEventListener("abort", () => emit(Effect.die(new DOMException("Aborted", "AbortError"))), { once: true })
    return Effect.void
  })
}

export function createToolLoop(
  config: ToolLoopConfig,
): (
  request: LLMRequest,
  executor: ToolExecutor,
) => Stream.Stream<LLMEvent, Error> {
  const maxSteps = config.maxSteps ?? 10
  const maxTokens = config.maxTokens
  const timeoutMs = config.timeoutMs
  const layer = config.layer ?? llmClientLayer(config.routes)
  const signal = config.abortSignal
  const deadline = timeoutMs ? Date.now() + timeoutMs : undefined
  const RETRY_CONFIG = { maxRetries: 5, baseDelayMs: 800, maxDelayMs: 20000 }

  const loop = (
    request: LLMRequest,
    executor: ToolExecutor,
    step: number,
    totalTokensUsed: number,
    prevCall: { name: string; inputKey: string } | undefined,
  ): Effect.Effect<Stream.Stream<LLMEvent, Error>, Error, LLMClientInterface> => {
    if (step >= maxSteps) {
      return Effect.succeed(Stream.fromIterable([
        { type: "finish", reason: "max-steps" } as LLMEvent,
      ]))
    }

    if (deadline && Date.now() > deadline) {
      return Effect.succeed(Stream.fromIterable([
        { type: "finish", reason: "timeout" } as LLMEvent,
      ]))
    }

    return Effect.gen(function* () {
      const client = yield* LLMClient
      const streamFor = (req: LLMRequest) => withRetry(client, RETRY_CONFIG).stream(req)

      const rawStream = signal
        ? streamFor(request).pipe(Stream.interruptWhen(makeAbortEffect(signal)))
        : streamFor(request)

      const toolCalls: Array<ToolCall_> = []
      let stepTokens = 0
      let finishEvent: LLMEvent | null = null
      let hasError = false

      // Forward events in real-time while detecting tool calls as a side effect.
      // Finish and think tool-call events are stripped from the forwarded stream
      // — they're handled internally in the continuation below.
      const eventStream = rawStream.pipe(
        Stream.catchAll((err) => {
          hasError = true
          return Stream.make({
            type: "provider-error" as const,
            message: describeError(err),
          } as LLMEvent)
        }),
        Stream.tap((event) =>
          Effect.sync(() => {
            if (event.type === "tool-call") {
              toolCalls.push(event as ToolCall_)
            }
            if (event.type === "finish") {
              finishEvent = event
              if (event.usage) {
                stepTokens = event.usage.totalTokens ?? 0
              }
            }
            if (event.type === "provider-error") {
              hasError = true
            }
          }),
        ),
        Stream.filter((event): event is LLMEvent => {
          if (event.type === "finish") return false
          if (event.type === "tool-call" && (event as ToolCall_).name === "think") return false
          return true
        }),
      )

      // After all events have been forwarded, decide whether to end or continue.
      const continuation = Effect.gen(function* () {
        const newTotal = totalTokensUsed + stepTokens
        if (maxTokens && newTotal > maxTokens) {
          return Stream.make({ type: "finish", reason: "token-budget" } as LLMEvent)
        }

        if (toolCalls.length === 0) {
          if (finishEvent) return Stream.make(finishEvent)
          // If a provider-error was already emitted by catchAll, don't synthesize
          // a finish — it would overwrite the error in smoothStream's pendingFinish.
          if (hasError) return Stream.empty as any
          // Stream ended without a finish or error — synthesize one so consumers
          // (especially smoothStream) always get a terminal event
          return Stream.make({
            type: "finish",
            reason: "unknown",
          } as LLMEvent)
        }

        // Repeated identical call detector: check ALL tool calls, not just the first
        if (prevCall && toolCalls.some((tc) => {
          return tc.name === prevCall.name && JSON.stringify(tc.input) === prevCall.inputKey
        })) {
          return Stream.make({ type: "finish", reason: "repeated-call" } as LLMEvent)
        }

        const isThinkCall = (tc: ToolCall_) => tc.name === "think"
        const thinkIds = new Set(toolCalls.filter(isThinkCall).map(tc => tc.id))

        const thinkReasoningEvents: Array<LLMEvent> = []

        const toolResults: Array<ToolResult_> = yield* Effect.forEach(
          toolCalls,
          (tc) =>
            Effect.gen(function* () {
              if (isThinkCall(tc)) {
                const thought = (tc.input as any)?.thought ?? ""
                thinkReasoningEvents.push(
                  { type: "reasoning-start" as const, id: tc.id },
                  { type: "reasoning-delta" as const, id: tc.id, text: thought },
                  { type: "reasoning-end" as const, id: tc.id },
                )
                return {
                  type: "tool-result" as const,
                  id: tc.id,
                  name: tc.name,
                  result: "Noted.",
                } as ToolResult_
              }
              const out = yield* executor({ id: tc.id, name: tc.name, input: tc.input })
              return {
                type: "tool-result" as const,
                id: out.id,
                name: out.name,
                result: out.result,
              } as ToolResult_
            }).pipe(
              Effect.catchAll((err) =>
                Effect.succeed({
                  type: "tool-result" as const,
                  id: tc.id,
                  name: tc.name,
                  result: { error: err.message ?? String(err) },
                } as ToolResult_),
              ),
            ),
        )

        const assistantParts = toolCalls.map((tc) =>
          ToolCallPart.make({ id: tc.id, name: tc.name, input: tc.input }),
        )
        const assistantMsg = assistantMessage(assistantParts)

        const toolResultMsgs = toolResults.map((tr) =>
          toolMessage(
            ToolResultPart.make({
              id: tr.id,
              name: tr.name,
              result: tr.result,
            }),
          ),
        )

        const nextMessages: Array<typeof request.messages[number]> = [
          ...request.messages,
          assistantMsg,
          ...toolResultMsgs,
        ]
        const nextRequest = updateLLMRequest(request, { messages: nextMessages })

        const nextPrevCall = {
          name: toolCalls[0].name,
          inputKey: JSON.stringify(toolCalls[0].input),
        }

        const rest = yield* loop(nextRequest, executor, step + 1, newTotal, nextPrevCall)

        // Filter think tool results — they've been converted to reasoning events
        const nonThinkResults = toolResults.filter((tr) => !thinkIds.has(tr.id))

        return Stream.fromIterable([
          ...thinkReasoningEvents,
          ...nonThinkResults,
        ]).pipe(Stream.concat(rest))
      })

      const continuationStream = yield* continuation
      return Stream.concat(eventStream, continuationStream)
    }).pipe(
      Effect.catchAll((err) =>
        Effect.succeed(
          Stream.make({
            type: "provider-error" as const,
            message: (err as any).message ?? String(err),
          } as LLMEvent),
        ),
      ),
    ) as Effect.Effect<Stream.Stream<LLMEvent, Error>, Error, LLMClientInterface>
  }

  return (request: LLMRequest, executor: ToolExecutor) => {
    const base = Stream.unwrap(loop(request, executor, 0, 0, undefined).pipe(Effect.provide(layer)))
    if (!config.smooth) return base
    const smoothCfg = typeof config.smooth === "object" ? config.smooth : undefined
    return smoothStream(base as any, smoothCfg) as unknown as Stream.Stream<LLMEvent, Error>
  }
}
