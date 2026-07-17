import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { Effect, Stream } from "effect"
import {
  createResumableAdapter,
  createInMemoryStreamStore,
  type StreamEventStore,
} from "./resumable-adapter"
import type { LLMAdapter } from "../schema/adapter"
import type { LLMEvent } from "../schema/event-schemas"
import { LLMError } from "../schema"
import { LLMRequest as LLMRequestClass } from "../schema/messages"
import { Model } from "../schema/options"

function collectEvents(
  stream: Stream.Stream<LLMEvent, LLMError>,
): Effect.Effect<LLMEvent[], LLMError> {
  return Stream.runCollect(stream).pipe(
    Effect.map((chunk) => [...chunk]),
  )
}

const requestBase = new LLMRequestClass({
  model: Model.make({ id: "test-model", provider: "test-provider", route: {} }),
  system: [],
  messages: [],
  tools: [],
})

const textEvent: LLMEvent = { type: "text-delta", id: "t1", text: "hello" } as any
const finishEvent: LLMEvent = { type: "finish", reason: "stop" } as any
const errorEvent: LLMEvent = { type: "provider-error", message: "fail" } as any

describe("createResumableAdapter", () => {
  it("caches events on first call and replays on second call with same ID", async () => {
    let callCount = 0
    const adapter: LLMAdapter = {
      stream: () => {
        callCount++
        return Stream.fromIterable([textEvent, finishEvent] as any)
      },
    }
    const resumable = createResumableAdapter(adapter)

    const request = new LLMRequestClass({ ...requestBase, id: "test-stream-1" })
    const r1 = await Effect.runPromise(collectEvents(resumable.stream(request)))
    assert.equal(callCount, 1)
    assert.equal(r1.length, 2)

    const r2 = await Effect.runPromise(collectEvents(resumable.stream(request)))
    assert.equal(callCount, 1, "should not call adapter again")
    assert.equal(r2.length, 2)
    assert.equal(r2[0], textEvent)
    assert.equal(r2[1], finishEvent)
  })

  it("replays cached events then continues with new live events for incomplete cache", async () => {
    let callCount = 0
    const adapter: LLMAdapter = {
      stream: () => {
        callCount++
        return Stream.fromIterable([textEvent, finishEvent] as any)
      },
    }

    const store = createInMemoryStreamStore()
    const request = new LLMRequestClass({ ...requestBase, id: "test-stream-2" })
    const partialEvents: LLMEvent[] = [
      { type: "text-delta", id: "t1", text: "partial" } as any,
    ]
    await Effect.runPromise(store.append("test-stream-2", partialEvents))

    const resumable = createResumableAdapter(adapter, store)
    const r1 = await Effect.runPromise(
      collectEvents(resumable.stream(request)),
    )
    assert.equal(callCount, 1)
    // cached text-delta + live text-delta + finish = 3
    assert.equal(r1.length, 3)
    assert.equal((r1[0] as any).text, "partial")
    assert.equal((r1[1] as any).text, "hello")
    assert.equal((r1[2] as any).type, "finish")
  })

  it("does NOT cache or replay if request.id is not set", async () => {
    let callCount = 0
    const adapter: LLMAdapter = {
      stream: () => {
        callCount++
        return Stream.fromIterable([finishEvent] as any)
      },
    }
    const resumable = createResumableAdapter(adapter)

    const request = new LLMRequestClass({ ...requestBase, id: undefined })
    await Effect.runPromise(collectEvents(resumable.stream(request)))
    assert.equal(callCount, 1)

    await Effect.runPromise(collectEvents(resumable.stream(request)))
    assert.equal(callCount, 2, "should call adapter again without id")
  })

  it("uses external store when provided", async () => {
    const store: StreamEventStore = {
      append: () => Effect.succeed(void 0),
      get: () => Effect.succeed([]),
    }
    let appendCalled = false
    const trackingStore: StreamEventStore = {
      append: (_id, _events) =>
        Effect.sync(() => {
          appendCalled = true
        }),
      get: () => Effect.succeed([]),
    }

    const adapter: LLMAdapter = {
      stream: () => Stream.fromIterable([finishEvent] as any),
    }
    const resumable = createResumableAdapter(adapter, trackingStore)

    const request = new LLMRequestClass({ ...requestBase, id: "test-store" })
    await Effect.runPromise(collectEvents(resumable.stream(request)))
    assert.ok(appendCalled, "should use external store")
  })

  it("replays cached complete stream even if adapter would produce different output", async () => {
    let callCount = 0
    const adapter: LLMAdapter = {
      stream: () => {
        callCount++
        return Stream.fromIterable([
          { type: "text-delta", id: "t1", text: `call-${callCount}` } as any,
          finishEvent,
        ])
      },
    }
    const resumable = createResumableAdapter(adapter)

    const request = new LLMRequestClass({ ...requestBase, id: "test-deterministic" })
    const r1 = await Effect.runPromise(collectEvents(resumable.stream(request)))
    assert.equal(callCount, 1)
    assert.equal((r1[0] as any).text, "call-1")

    const r2 = await Effect.runPromise(collectEvents(resumable.stream(request)))
    assert.equal(callCount, 1, "adapter not called again")
    assert.equal((r2[0] as any).text, "call-1", "replays cached output, not new")
  })

  it("replays cached stream with provider-error as complete", async () => {
    const store = createInMemoryStreamStore()
    await Effect.runPromise(
      store.append("err-stream", [
        { type: "text-delta", id: "t1", text: "partial" } as any,
        { type: "provider-error", message: "failed" } as any,
      ]),
    )

    let callCount = 0
    const adapter: LLMAdapter = {
      stream: () => {
        callCount++
        return Stream.fromIterable([] as any)
      },
    }
    const resumable = createResumableAdapter(adapter, store)

    const request = new LLMRequestClass({ ...requestBase, id: "err-stream" })
    const r = await Effect.runPromise(
      collectEvents(resumable.stream(request)),
    )
    assert.equal(callCount, 0, "adapter not called")
    assert.equal(r.length, 2)
    assert.equal((r[1] as any).type, "provider-error")
  })

  it("starts fresh live stream when cached events have no terminal event", async () => {
    const store = createInMemoryStreamStore()
    await Effect.runPromise(
      store.append("partial-stream", [
        { type: "text-delta", id: "t1", text: "partial" } as any,
      ]),
    )

    let callCount = 0
    const adapter: LLMAdapter = {
      stream: () => {
        callCount++
        return Stream.fromIterable([
          { type: "text-delta", id: "t2", text: "continued" } as any,
          finishEvent,
        ])
      },
    }
    const resumable = createResumableAdapter(adapter, store)

    const request = new LLMRequestClass({ ...requestBase, id: "partial-stream" })
    const r = await Effect.runPromise(
      collectEvents(resumable.stream(request)),
    )
    assert.equal(callCount, 1, "adapter called for continued stream")
    assert.equal(r.length, 3) // partial + continued + finish
    assert.equal((r[0] as any).text, "partial")
    assert.equal((r[1] as any).text, "continued")
    assert.equal((r[2] as any).type, "finish")
  })
})
