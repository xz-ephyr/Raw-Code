import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { Effect, Stream } from "effect"
import { smoothStream } from "./smooth"
import type { LLMEvent } from "../schema/event-schemas"
import { LLMError, ProviderInternalReason } from "../schema"

function collectEvents(
  stream: Stream.Stream<LLMEvent, LLMError>,
): Effect.Effect<LLMEvent[], LLMError> {
  return Stream.runCollect(stream).pipe(
    Effect.map((chunk) => [...chunk]),
  )
}

const textEvent = (id: string, text: string): LLMEvent =>
  ({ type: "text-delta", id, text }) as any

const finishEvent: LLMEvent = { type: "finish", reason: "stop" } as any

const providerErrorEvent: LLMEvent = {
  type: "provider-error",
  message: "fail",
} as any

const toolCallEvent: LLMEvent = {
  type: "tool-call",
  id: "tc1",
  name: "search",
  input: { q: "test" },
} as any

describe("smoothStream", () => {
  it("passes non-text events through immediately", async () => {
    const stream = Stream.fromIterable([toolCallEvent, finishEvent])
    const result = await Effect.runPromise(
      collectEvents(smoothStream(stream, { baseTickMs: 1 })),
    )
    assert.equal(result.length, 2)
    assert.equal(result[0], toolCallEvent)
    assert.equal(result[1], finishEvent)
  })

  it("splits text-delta events into smaller chunks", async () => {
    const stream = Stream.fromIterable([
      textEvent("t1", "Hello World"),
      finishEvent,
    ])
    const result = await Effect.runPromise(
      collectEvents(
        smoothStream(stream, {
          baseTickMs: 1,
          minCharsPerTick: 2,
          maxCharsPerTick: 2,
          wordBoundaryAware: false,
        }),
      ),
    )

    assert.ok(result.length > 2, "should produce more events than input")
    const textEvents = result.filter((e) => e.type === "text-delta")
    const combined = textEvents.map((e: any) => e.text).join("")
    assert.equal(combined, "Hello World")
  })

  it("includes finish event at the end", async () => {
    const stream = Stream.fromIterable([
      textEvent("t1", "hi"),
      finishEvent,
    ])
    const result = await Effect.runPromise(
      collectEvents(smoothStream(stream, { baseTickMs: 1, maxCharsPerTick: 10 })),
    )

    const finish = result.find((e) => e.type === "finish")
    assert.ok(finish, "should include finish event")
  })

  it("includes provider-error event at the end", async () => {
    const stream = Stream.fromIterable([
      textEvent("t1", "partial"),
      providerErrorEvent,
    ])
    const result = await Effect.runPromise(
      collectEvents(smoothStream(stream, { baseTickMs: 1, maxCharsPerTick: 10 })),
    )

    const error = result.find((e) => e.type === "provider-error")
    assert.ok(error, "should include provider-error")
    const text = result
      .filter((e: any) => e.type === "text-delta")
      .map((e: any) => e.text)
      .join("")
    assert.equal(text, "partial")
  })

  it("smooth event IDs are unique", async () => {
    const stream = Stream.fromIterable([
      textEvent("t1", "abc"),
      finishEvent,
    ])
    const result = await Effect.runPromise(
      collectEvents(smoothStream(stream, { baseTickMs: 1, maxCharsPerTick: 1 })),
    )

    const ids = result
      .filter((e: any) => e.type === "text-delta")
      .map((e: any) => e.id)
    assert.equal(new Set(ids).size, ids.length, "all IDs should be unique")
  })

  it("handles empty string in text-delta", async () => {
    const stream = Stream.fromIterable([
      textEvent("t1", ""),
      finishEvent,
    ])
    const result = await Effect.runPromise(
      collectEvents(smoothStream(stream, { baseTickMs: 1 })),
    )

    const finish = result.find((e) => e.type === "finish")
    assert.ok(finish)
  })

  it("propagates stream errors", async () => {
    const error = new LLMError({
      module: "test",
      method: "stream",
      reason: new ProviderInternalReason({ message: "boom", status: 500 }),
    })
    const stream = Stream.fail(error)
    const caught = await Effect.runPromise(
      Effect.flip(collectEvents(smoothStream(stream, { baseTickMs: 1 }))),
    )
    assert.ok(caught instanceof LLMError)
  })

  it("applies adaptive rate: large backlog yields more chars per tick", async () => {
    const long = "x".repeat(500)
    const stream = Stream.fromIterable([textEvent("t1", long), finishEvent])

    const result = await Effect.runPromise(
      collectEvents(
        smoothStream(stream, {
          baseTickMs: 1,
          minCharsPerTick: 50,
          maxCharsPerTick: 200,
          wordBoundaryAware: false,
        }),
      ),
    )

    const textEvents = result.filter((e: any) => e.type === "text-delta")
    assert.ok(
      textEvents.length <= 10,
      `expected at most 10 events for large backlog, got ${textEvents.length}`,
    )
  })

  it("drains buffer on finish with charsPerTick=1", async () => {
    const stream = Stream.fromIterable([
      textEvent("t1", "AB"),
      finishEvent,
    ])
    const result = await Effect.runPromise(
      collectEvents(
        smoothStream(stream, {
          baseTickMs: 1,
          minCharsPerTick: 1,
          maxCharsPerTick: 1,
          wordBoundaryAware: false,
        }),
      ),
    )

    const text = result
      .filter((e: any) => e.type === "text-delta")
      .map((e: any) => e.text)
      .join("")
    assert.equal(text, "AB")
  })

  it("interleaves non-text events with smoothed text", async () => {
    const stream = Stream.fromIterable([
      textEvent("t1", "hello"),
      toolCallEvent,
      textEvent("t2", " world"),
      finishEvent,
    ])
    const result = await Effect.runPromise(
      collectEvents(
        smoothStream(stream, {
          baseTickMs: 1,
          maxCharsPerTick: 10,
          wordBoundaryAware: false,
        }),
      ),
    )

    const types = result.map((e: any) => e.type)
    assert.ok(types.includes("tool-call"), "should include tool-call")
    assert.ok(types.includes("finish"), "should include finish")
    const text = result
      .filter((e: any) => e.type === "text-delta")
      .map((e: any) => e.text)
      .join("")
    assert.equal(text, "hello world")
  })

  it("flushes remaining buffer on finish even with large backlog", async () => {
    const long = "A".repeat(100)
    const stream = Stream.fromIterable([textEvent("t1", long), finishEvent])

    const result = await Effect.runPromise(
      collectEvents(
        smoothStream(stream, {
          baseTickMs: 1,
          minCharsPerTick: 1,
          maxCharsPerTick: 1,
          wordBoundaryAware: false,
        }),
      ),
    )

    const text = result
      .filter((e: any) => e.type === "text-delta")
      .map((e: any) => e.text)
      .join("")
    assert.equal(text, long)
  })
})
