import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { Stream, Effect } from "effect"
import { createOrchestrator, type ToolExecutor } from "./orchestrator"
import type { LLMAdapter } from "../schema/adapter"
import type { LLMEvent } from "../schema/event-schemas"
import { LLMError, LLMRequest } from "../schema"
import { Model } from "../schema/options"

const baseRequest = new LLMRequest({
  model: Model.make({ id: "test-model", provider: "test-provider", route: {} }),
  messages: [],
  system: [],
  tools: [],
})

function makeAdapter(events: ReadonlyArray<LLMEvent>): LLMAdapter {
  return {
    stream: () => Stream.fromIterable([...events] as any),
  }
}

function collectEvents(
  stream: Stream.Stream<LLMEvent, LLMError>,
): Effect.Effect<readonly LLMEvent[], LLMError> {
  return Stream.runCollect(stream as any).pipe(
    Effect.map((chunk) => [...chunk] as any),
  )
}

const noopExecutor: ToolExecutor = () =>
  Effect.die(new Error("unexpected tool call"))

describe("Orchestrator", () => {
  it("passes through events without tool calls", async () => {
    const events: LLMEvent[] = [
      { type: "step-start", index: 0 },
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", text: "Hi" },
      { type: "text-end", id: "t1" },
      { type: "finish", reason: "stop" },
    ] as any
    const result = await Effect.runPromise(
      collectEvents(createOrchestrator({ adapter: makeAdapter(events) }).stream(baseRequest, noopExecutor)),
    )
    assert.equal(result.length, 5)
    assert.equal(result[4].type, "finish")
  })

  it("executes tool calls and recurses", async () => {
    const toolCall: LLMEvent = { type: "tool-call", id: "tc_1", name: "get_weather", input: { city: "London" } } as any
    const finish: LLMEvent = { type: "finish", reason: "tool-calls" } as any
    const step2events: LLMEvent[] = [
      { type: "step-start", index: 0 },
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", text: "22°C" },
      { type: "text-end", id: "t1" },
      { type: "finish", reason: "stop" },
    ] as any

    let callCount = 0
    const adapter: LLMAdapter = {
      stream: () => {
        callCount++
        return Stream.fromIterable(callCount === 1 ? [toolCall, finish] as any : step2events as any)
      },
    }

    const executor: ToolExecutor = (input) =>
      Effect.succeed({ id: input.id, name: input.name, result: { temp: 22 } })

    const result = await Effect.runPromise(
      collectEvents(createOrchestrator({ adapter }).stream(baseRequest, executor)),
    )
    assert.equal(callCount, 2)
    const toolResults = result.filter((e: any) => e.type === "tool-result")
    assert.equal(toolResults.length, 1)
    assert.deepEqual(toolResults[0].result, { temp: 22 })
    assert.ok(result.some((e: any) => e.type === "text-delta"))
  })

  it("finalizes partial events when stream ends without finish", async () => {
    const events: LLMEvent[] = [
      { type: "step-start", index: 0 },
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", text: "Partial " },
    ] as any

    const result = await Effect.runPromise(
      collectEvents(createOrchestrator({ adapter: makeAdapter(events) }).stream(baseRequest, noopExecutor)),
    )
    const finish = result.find((e: any) => e.type === "finish") as any
    assert.ok(finish, "expected finish event")
    assert.equal(finish.reason, "interrupted")
    assert.ok(result.some((e: any) => e.type === "text-end"), "expected text-end to close partial block")
  })

  it("stops at maxSteps", async () => {
    const toolCall: LLMEvent = { type: "tool-call", id: "tc_1", name: "loop_tool", input: {} } as any
    const finish: LLMEvent = { type: "finish", reason: "tool-calls" } as any

    const adapter: LLMAdapter = {
      stream: () => Stream.fromIterable([toolCall, finish] as any),
    }

    const executor: ToolExecutor = () =>
      Effect.succeed({ id: "tc_1", name: "loop_tool", result: {} })

    const result = await Effect.runPromise(
      collectEvents(
        createOrchestrator({ adapter, maxSteps: 2 }).stream(baseRequest, executor),
      ),
    )
    const toolResults = result.filter((e: any) => e.type === "tool-result")
    assert.ok(toolResults.length <= 2)
  })

  it("propagates provider-error events", async () => {
    const errorEvent: LLMEvent = { type: "provider-error", message: "Rate limit" } as any
    const result = await Effect.runPromise(
      collectEvents(createOrchestrator({ adapter: makeAdapter([errorEvent]) }).stream(baseRequest, noopExecutor)),
    )
    const errors = result.filter((e: any) => e.type === "provider-error")
    assert.equal(errors.length, 1)
    assert.equal(errors[0].message, "Rate limit")
  })

  it("handles tool calls without finish event gracefully", async () => {
    const events: LLMEvent[] = [
      { type: "step-start", index: 0 },
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", text: "Thinking" },
    ] as any

    const result = await Effect.runPromise(
      collectEvents(createOrchestrator({ adapter: makeAdapter(events) }).stream(baseRequest, noopExecutor)),
    )
    assert.ok(result.some((e: any) => e.type === "text-end"), "should finalize open blocks")
    const finish = result.find((e: any) => e.type === "finish") as any
    assert.ok(finish)
    assert.equal(finish.reason, "interrupted")
  })

  it("finalizes reasoning blocks", async () => {
    const events: LLMEvent[] = [
      { type: "step-start", index: 0 },
      { type: "reasoning-start", id: "r1" },
      { type: "reasoning-delta", id: "r1", text: "Hmm" },
    ] as any

    const result = await Effect.runPromise(
      collectEvents(createOrchestrator({ adapter: makeAdapter(events) }).stream(baseRequest, noopExecutor)),
    )
    assert.ok(result.some((e: any) => e.type === "reasoning-end"), "expected reasoning-end")
  })

  it("finalizes tool-input blocks", async () => {
    const events: LLMEvent[] = [
      { type: "step-start", index: 0 },
      { type: "tool-input-start", id: "t1", name: "get_data" },
      { type: "tool-input-delta", id: "t1", text: '{"key"' },
    ] as any

    const result = await Effect.runPromise(
      collectEvents(createOrchestrator({ adapter: makeAdapter(events) }).stream(baseRequest, noopExecutor)),
    )
    assert.ok(result.some((e: any) => e.type === "tool-input-end"), "expected tool-input-end")
  })

  it("finalizes multiple open blocks", async () => {
    const events: LLMEvent[] = [
      { type: "step-start", index: 0 },
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", text: "Hello" },
      { type: "reasoning-start", id: "r1" },
      { type: "reasoning-delta", id: "r1", text: "thinking" },
    ] as any

    const result = await Effect.runPromise(
      collectEvents(createOrchestrator({ adapter: makeAdapter(events) }).stream(baseRequest, noopExecutor)),
    )
    const endEvents = result.filter(
      (e: any) => e.type === "text-end" || e.type === "reasoning-end",
    )
    assert.equal(endEvents.length, 2)
  })
})
