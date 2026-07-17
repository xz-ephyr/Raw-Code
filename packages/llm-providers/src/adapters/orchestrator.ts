import { Stream, Effect } from "effect"
import type { LLMAdapter } from "../schema/adapter"
import type { LLMEvent, ToolCall_, ToolResult_ } from "../schema/event-schemas"
import { LLMError } from "../schema"
import type { LLMRequest } from "../schema/messages"
import {
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

export interface OrchestratorConfig {
  readonly adapter: LLMAdapter
  readonly maxSteps?: number
}

export interface Orchestrator {
  readonly stream: (
    request: LLMRequest,
    executor: ToolExecutor,
    signal?: AbortSignal,
  ) => Stream.Stream<LLMEvent, LLMError>
}

interface OpenBlock {
  readonly type: "text" | "reasoning" | "tool-input"
  readonly id: string
}

function trackOpenBlocks(events: readonly LLMEvent[]): readonly OpenBlock[] {
  const blocks: OpenBlock[] = []
  for (const event of events) {
    if (event.type === "text-start") blocks.push({ type: "text", id: event.id })
    else if (event.type === "text-end") removeBlock(blocks, event.id)
    else if (event.type === "reasoning-start") blocks.push({ type: "reasoning", id: event.id })
    else if (event.type === "reasoning-end") removeBlock(blocks, event.id)
    else if (event.type === "tool-input-start") blocks.push({ type: "tool-input", id: event.id })
    else if (event.type === "tool-input-end") removeBlock(blocks, event.id)
  }
  return blocks
}

function removeBlock(blocks: OpenBlock[], id: string): void {
  const idx = blocks.findIndex((b) => b.id === id)
  if (idx >= 0) blocks.splice(idx, 1)
}

function finalizePartialEvents(
  events: readonly LLMEvent[],
  openBlocks: readonly OpenBlock[],
): readonly LLMEvent[] {
  const result = [...events]
  for (const block of openBlocks) {
    switch (block.type) {
      case "text":
        result.push({ type: "text-end", id: block.id, providerMetadata: undefined } as any)
        break
      case "reasoning":
        result.push({ type: "reasoning-end", id: block.id, providerMetadata: undefined } as any)
        break
      case "tool-input":
        result.push({ type: "tool-input-end", id: block.id, name: "" } as any)
        break
    }
  }
  return result
}

export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
  const maxSteps = config.maxSteps ?? 10

  function loop(
    request: LLMRequest,
    executor: ToolExecutor,
    signal: AbortSignal | undefined,
    step: number,
  ): Effect.Effect<Stream.Stream<LLMEvent, LLMError>, LLMError> {
    if (step >= maxSteps) return Effect.succeed(Stream.empty)

    return Effect.gen(function* () {
      const events: Array<LLMEvent> = []

      const rawStream = config.adapter.stream(request, signal).pipe(
        Stream.tap((event) => Effect.sync(() => events.push(event))),
      )

      yield* Stream.runDrain(rawStream).pipe(
        Effect.catchAll((_err) => Effect.void),
      )

      const aborted = signal?.aborted ?? false
      const hasFinish = events.some((e) => e.type === "finish")
      const hasError = events.some((e) => e.type === "provider-error")

      if (aborted || (!hasFinish && !hasError && events.length > 0)) {
        const openBlocks = trackOpenBlocks(events)
        const finalized = finalizePartialEvents(events, openBlocks)
        const finishEvent: LLMEvent = {
          type: "finish",
          reason: "interrupted",
        } as any
        return Stream.fromIterable([...finalized, finishEvent])
      }

      const toolCalls = events.filter(
        (e): e is ToolCall_ => e.type === "tool-call",
      )

      if (toolCalls.length === 0) {
        return Stream.fromIterable(events)
      }

      const toolResults: Array<ToolResult_> = yield* Effect.forEach(
        toolCalls,
        (tc) =>
          Effect.gen(function* () {
            const out = yield* executor({
              id: tc.id,
              name: tc.name,
              input: tc.input,
            })
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

      const nextMessages = [
        ...request.messages,
        assistantMsg,
        ...toolResultMsgs,
      ] as unknown as typeof request.messages
      const nextRequest = updateLLMRequest(request, { messages: nextMessages })

      const rest = yield* loop(nextRequest, executor, signal, step + 1)

      return Stream.fromIterable([
        ...events.filter((e) => e.type !== "finish"),
        ...toolResults,
      ]).pipe(Stream.concat(rest))
    })
  }

  return {
    stream: (
      request: LLMRequest,
      executor: ToolExecutor,
      signal?: AbortSignal,
    ) => Stream.unwrap(loop(request, executor, signal, 0)),
  }
}
