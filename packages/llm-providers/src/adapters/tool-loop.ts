import { Stream, Effect } from "effect"
import { Service as LLMClient, layer as llmClientLayer } from "../route/client"
import { withRetry } from "./with-retry"
import type { AnyRoute, Interface as LLMClientInterface } from "../route/client"
import { LLMEvent } from "../schema/event-schemas"
import type { ToolCall_, ToolResult_ } from "../schema/event-schemas"
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
  readonly abortSignal?: AbortSignal
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
  const layer = llmClientLayer(config.routes)
  const signal = config.abortSignal
  // Retry transient/rate-limit failures (e.g. HTTP 429) so a teamwork run is
  // resilient to provider rate-limit storms. withRetry only retries before the
  // first event is seen and only when the LLMError is marked retryable.
  const RETRY_CONFIG = { maxRetries: 5, baseDelayMs: 800, maxDelayMs: 20000 }

  const loop = (
    request: LLMRequest,
    executor: ToolExecutor,
    step: number,
  ): Effect.Effect<Stream.Stream<LLMEvent, Error>, Error, LLMClientInterface> => {
    if (step >= maxSteps) {
      return Effect.succeed(Stream.empty)
    }

    return Effect.gen(function* () {
      const client = yield* LLMClient
      const streamFor = (req: LLMRequest) => withRetry(client, RETRY_CONFIG).stream(req)

      const rawStream = signal
        ? streamFor(request).pipe(Stream.interruptWhen(makeAbortEffect(signal)))
        : streamFor(request)

      const chunk = yield* Stream.runCollect(
        rawStream.pipe(
          Stream.catchAll((err) =>
            Stream.make({
              type: "provider-error" as const,
              message: describeError(err),
            } as LLMEvent),
          ),
        ),
      )

      const events: Array<LLMEvent> = []
      const toolCalls: Array<ToolCall_> = []

      for (const event of chunk) {
        events.push(event)
        if (event.type === "tool-call") {
          toolCalls.push(event as ToolCall_)
        }
      }

      if (toolCalls.length === 0) {
        return Stream.fromIterable(events)
      }

      const toolResults: Array<ToolResult_> = yield* Effect.forEach(
        toolCalls,
        (tc) =>
          Effect.gen(function* () {
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

      const rest = yield* loop(nextRequest, executor, step + 1)

      return Stream.fromIterable([
        ...events.filter((e) => e.type !== "finish"),
        ...toolResults,
      ]).pipe(Stream.concat(rest))
    }).pipe(
      Effect.catchAll((err) =>
        Effect.succeed(
          Stream.make({
            type: "provider-error" as const,
            message: err.message ?? String(err),
          } as LLMEvent),
        ),
      ),
    )
  }

  return (request: LLMRequest, executor: ToolExecutor) =>
    Stream.unwrap(loop(request, executor, 0).pipe(Effect.provide(layer)))
}
