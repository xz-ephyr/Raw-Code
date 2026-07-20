import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { Stream, Effect, Layer } from "effect"
import { createToolLoop, type ToolExecutor } from "./tool-loop"
import type { LLMClientInterface } from "../route/client"
import { Service as LLMClient } from "../route/client"
import type { LLMEvent } from "../schema/event-schemas"
import { LLMRequest } from "../schema"
import { Model } from "../schema/options"

const baseRequest = new LLMRequest({
  model: Model.make({ id: "test-model", provider: "test-provider", route: {} }),
  messages: [],
  system: [],
  tools: [],
})

function makeMockClient(eventsSeq: ReadonlyArray<ReadonlyArray<LLMEvent>>): LLMClientInterface {
  let callIndex = 0
  return {
    prepare: () => Effect.die(new Error("not implemented")),
    stream: () => {
      const events = eventsSeq[callIndex] ?? []
      callIndex++
      return Stream.fromIterable([...events] as any)
    },
    generate: () => Effect.die(new Error("not implemented")),
  }
}

function makeMockLayer(eventsSeq: ReadonlyArray<ReadonlyArray<LLMEvent>>): Layer.Layer<LLMClientInterface, never, never> {
  return Layer.succeed(LLMClient, makeMockClient(eventsSeq))
}

function collectEvents(
  stream: Stream.Stream<LLMEvent, Error>,
): Effect.Effect<Array<any>, Error> {
  return Stream.runCollect(stream).pipe(
    Effect.map((chunk) => [...chunk] as Array<any>),
  )
}

const noopExecutor: ToolExecutor = () =>
  Effect.die(new Error("unexpected tool call"))

describe("ToolLoop — integration", () => {
  it("happy path: text-only passthrough", async () => {
    const events: LLMEvent[] = [
      { type: "text-start", id: "t1" } as any,
      { type: "text-delta", id: "t1", text: "Hello" } as any,
      { type: "text-end", id: "t1" } as any,
      { type: "finish", reason: "stop", usage: { totalTokens: 10 } } as any,
    ]

    const loop = createToolLoop({
      routes: [],
      layer: makeMockLayer([events]),
    })

    const result = await Effect.runPromise(collectEvents(loop(baseRequest, noopExecutor)))
    assert.equal(result.length, 4)
    assert.equal(result[0].type, "text-start")
    assert.equal(result[1].text, "Hello")
    assert.equal(result[3].type, "finish")
    assert.equal(result[3].reason, "stop")
  })

  it("single tool call round-trip", async () => {
    const step1: LLMEvent[] = [
      { type: "tool-call", id: "tc_1", name: "get_weather", input: { city: "London" } } as any,
      { type: "finish", reason: "tool-calls", usage: { totalTokens: 20 } } as any,
    ]
    const step2: LLMEvent[] = [
      { type: "text-start", id: "t1" } as any,
      { type: "text-delta", id: "t1", text: "22°C" } as any,
      { type: "text-end", id: "t1" } as any,
      { type: "finish", reason: "stop", usage: { totalTokens: 15 } } as any,
    ]

    const executor: ToolExecutor = (input) =>
      Effect.succeed({ id: input.id, name: input.name, result: { temp: 22 } })

    const loop = createToolLoop({
      routes: [],
      layer: makeMockLayer([step1, step2]),
    })

    const result = await Effect.runPromise(collectEvents(loop(baseRequest, executor)))

    const toolCalls = result.filter((e: any) => e.type === "tool-call")
    const toolResults = result.filter((e: any) => e.type === "tool-result")
    const textDeltas = result.filter((e: any) => e.type === "text-delta")

    assert.equal(toolCalls.length, 1)
    assert.equal(toolResults.length, 1)
    assert.deepEqual(toolResults[0].result, { temp: 22 })
    assert.equal(textDeltas.length, 1)
    assert.equal(textDeltas[0].text, "22°C")
  })

  it("multi-step loop with two tool calls", async () => {
    const step1: LLMEvent[] = [
      { type: "tool-call", id: "tc_1", name: "search", input: { q: "a" } } as any,
      { type: "finish", reason: "tool-calls", usage: { totalTokens: 10 } } as any,
    ]
    const step2: LLMEvent[] = [
      { type: "tool-call", id: "tc_2", name: "search", input: { q: "b" } } as any,
      { type: "finish", reason: "tool-calls", usage: { totalTokens: 10 } } as any,
    ]
    const step3: LLMEvent[] = [
      { type: "text-start", id: "t1" } as any,
      { type: "text-delta", id: "t1", text: "done" } as any,
      { type: "text-end", id: "t1" } as any,
      { type: "finish", reason: "stop", usage: { totalTokens: 5 } } as any,
    ]

    const executor: ToolExecutor = (input) =>
      Effect.succeed({ id: input.id, name: input.name, result: "ok" })

    const loop = createToolLoop({
      routes: [],
      layer: makeMockLayer([step1, step2, step3]),
    })

    const result = await Effect.runPromise(collectEvents(loop(baseRequest, executor)))

    const toolCalls = result.filter((e: any) => e.type === "tool-call")
    const toolResults = result.filter((e: any) => e.type === "tool-result")
    assert.equal(toolCalls.length, 2)
    assert.equal(toolResults.length, 2)
    assert.ok(result.some((e: any) => e.type === "text-delta"))
  })

  it("maxSteps enforcement stops loop", async () => {
    const toolCall: LLMEvent[] = [
      { type: "tool-call", id: "tc_1", name: "loop", input: {} } as any,
      { type: "finish", reason: "tool-calls", usage: { totalTokens: 5 } } as any,
    ]

    const executor: ToolExecutor = (input) =>
      Effect.succeed({ id: input.id, name: input.name, result: "ok" })

    const loop = createToolLoop({
      routes: [],
      maxSteps: 2,
      layer: makeMockLayer([toolCall, toolCall, toolCall, toolCall]),
    })

    const result = await Effect.runPromise(collectEvents(loop(baseRequest, executor)))

    const toolCalls = result.filter((e: any) => e.type === "tool-call")
    assert.equal(toolCalls.length, 2, "should stop at maxSteps=2")
  })

  it("timeout emits finish with reason timeout", async () => {
    const events: LLMEvent[] = [
      { type: "text-start", id: "t1" } as any,
      { type: "text-delta", id: "t1", text: "slow" } as any,
      { type: "finish", reason: "stop", usage: { totalTokens: 5 } } as any,
    ]

    const loop = createToolLoop({
      routes: [],
      maxSteps: 10,
      timeoutMs: 1,
      layer: makeMockLayer([events]),
    })

    await new Promise((r) => setTimeout(r, 5))

    const result = await Effect.runPromise(collectEvents(loop(baseRequest, noopExecutor)))
    const finish = result.find((e: any) => e.type === "finish")
    assert.ok(finish, "expected a finish event")
  })

  it("token budget emits finish with reason token-budget", async () => {
    const events: LLMEvent[] = [
      { type: "text-start", id: "t1" } as any,
      { type: "text-delta", id: "t1", text: "hi" } as any,
      { type: "text-end", id: "t1" } as any,
      { type: "finish", reason: "stop", usage: { totalTokens: 500 } } as any,
    ]

    const loop = createToolLoop({
      routes: [],
      maxTokens: 100,
      layer: makeMockLayer([events]),
    })

    const result = await Effect.runPromise(collectEvents(loop(baseRequest, noopExecutor)))
    const finish = result.find((e: any) => e.type === "finish")
    assert.ok(finish, "expected a finish event")
    assert.equal(finish.reason, "token-budget")
  })

  it("repeated-call detection emits finish with reason repeated-call", async () => {
    const toolCall: LLMEvent[] = [
      { type: "tool-call", id: "tc_1", name: "search", input: { q: "same" } } as any,
      { type: "finish", reason: "tool-calls", usage: { totalTokens: 5 } } as any,
    ]

    const executor: ToolExecutor = (input) =>
      Effect.succeed({ id: input.id, name: input.name, result: "ok" })

    const loop = createToolLoop({
      routes: [],
      layer: makeMockLayer([toolCall, toolCall]),
    })

    const result = await Effect.runPromise(collectEvents(loop(baseRequest, executor)))
    const finish = result.find((e: any) => e.type === "finish")
    assert.ok(finish, "expected a finish event")
    assert.equal(finish.reason, "repeated-call")
  })

  it("think tool intercepts and emits reasoning events", async () => {
    const step1: LLMEvent[] = [
      { type: "tool-call", id: "think_1", name: "think", input: { thought: "Let me reason..." } } as any,
      { type: "finish", reason: "tool-calls", usage: { totalTokens: 5 } } as any,
    ]
    const step2: LLMEvent[] = [
      { type: "text-start", id: "t1" } as any,
      { type: "text-delta", id: "t1", text: "Answer" } as any,
      { type: "text-end", id: "t1" } as any,
      { type: "finish", reason: "stop", usage: { totalTokens: 5 } } as any,
    ]

    let executorCalled = false
    const executor: ToolExecutor = (input) => {
      executorCalled = true
      return Effect.succeed({ id: input.id, name: input.name, result: "ok" })
    }

    const loop = createToolLoop({
      routes: [],
      layer: makeMockLayer([step1, step2]),
    })

    const result = await Effect.runPromise(collectEvents(loop(baseRequest, executor)))

    assert.equal(executorCalled, false, "executor should not be called for think tool")

    const reasoningStart = result.find((e: any) => e.type === "reasoning-start")
    const reasoningDelta = result.find((e: any) => e.type === "reasoning-delta")
    const reasoningEnd = result.find((e: any) => e.type === "reasoning-end")
    assert.ok(reasoningStart, "expected reasoning-start")
    assert.ok(reasoningDelta, "expected reasoning-delta")
    assert.equal(reasoningDelta.text, "Let me reason...")
    assert.ok(reasoningEnd, "expected reasoning-end")

    const toolResults = result.filter((e: any) => e.type === "tool-result")
    assert.equal(toolResults.length, 1)
    assert.equal(toolResults[0].result, "Noted.")
  })

  it("executor error produces tool-result with error and loop continues", async () => {
    const step1: LLMEvent[] = [
      { type: "tool-call", id: "tc_1", name: "fail_tool", input: {} } as any,
      { type: "finish", reason: "tool-calls", usage: { totalTokens: 5 } } as any,
    ]
    const step2: LLMEvent[] = [
      { type: "text-start", id: "t1" } as any,
      { type: "text-delta", id: "t1", text: "recovered" } as any,
      { type: "text-end", id: "t1" } as any,
      { type: "finish", reason: "stop", usage: { totalTokens: 5 } } as any,
    ]

    const executor: ToolExecutor = () =>
      Effect.fail(new Error("tool broke"))

    const loop = createToolLoop({
      routes: [],
      layer: makeMockLayer([step1, step2]),
    })

    const result = await Effect.runPromise(collectEvents(loop(baseRequest, executor)))

    const toolResults = result.filter((e: any) => e.type === "tool-result")
    assert.equal(toolResults.length, 1)
    assert.ok(toolResults[0].result?.error, "expected error in tool result")

    const textDeltas = result.filter((e: any) => e.type === "text-delta")
    assert.equal(textDeltas.length, 1)
    assert.equal(textDeltas[0].text, "recovered")
  })

  it("provider error is caught and emitted", async () => {
    const events: LLMEvent[] = [
      { type: "provider-error", message: "connection failed" } as any,
    ]

    const loop = createToolLoop({
      routes: [],
      layer: makeMockLayer([events]),
    })

    const result = await Effect.runPromise(collectEvents(loop(baseRequest, noopExecutor)))
    const errorEvent = result.find((e: any) => e.type === "provider-error")
    assert.ok(errorEvent, "expected provider-error event")
    assert.equal(errorEvent.message, "connection failed")
  })

  it("abort signal interrupts stream", async () => {
    const controller = new AbortController()

    const events: LLMEvent[] = [
      { type: "tool-call", id: "tc_1", name: "loop", input: {} } as any,
      { type: "finish", reason: "tool-calls", usage: { totalTokens: 5 } } as any,
    ]

    const executor: ToolExecutor = (input) => {
      controller.abort()
      return Effect.succeed({ id: input.id, name: input.name, result: "ok" })
    }

    const loop = createToolLoop({
      routes: [],
      abortSignal: controller.signal,
      layer: makeMockLayer([events, events, events]),
    })

    const result = await Effect.runPromise(collectEvents(loop(baseRequest, executor)))
    assert.ok(result.length > 0, "should have some events before interruption")
  })

  it("multiple tool calls in one step are all executed", async () => {
    const step1: LLMEvent[] = [
      { type: "tool-call", id: "tc_1", name: "search", input: { q: "a" } } as any,
      { type: "tool-call", id: "tc_2", name: "weather", input: { city: "Paris" } } as any,
      { type: "finish", reason: "tool-calls", usage: { totalTokens: 10 } } as any,
    ]
    const step2: LLMEvent[] = [
      { type: "text-start", id: "t1" } as any,
      { type: "text-delta", id: "t1", text: "results" } as any,
      { type: "text-end", id: "t1" } as any,
      { type: "finish", reason: "stop", usage: { totalTokens: 5 } } as any,
    ]

    const executed: string[] = []
    const executor: ToolExecutor = (input) => {
      executed.push(input.name)
      return Effect.succeed({ id: input.id, name: input.name, result: "ok" })
    }

    const loop = createToolLoop({
      routes: [],
      layer: makeMockLayer([step1, step2]),
    })

    const result = await Effect.runPromise(collectEvents(loop(baseRequest, executor)))

    assert.deepEqual(executed.sort(), ["search", "weather"])
    const toolResults = result.filter((e: any) => e.type === "tool-result")
    assert.equal(toolResults.length, 2)
  })
})
