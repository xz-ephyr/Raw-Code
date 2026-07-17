import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { Effect, Stream, Option } from "effect"
import { withRetry } from "./with-retry"
import type { LLMAdapter } from "../schema/adapter"
import type { LLMEvent } from "../schema/event-schemas"
import { LLMError, RateLimitReason, InvalidRequestReason } from "../schema"

function collectEvents(
  stream: Stream.Stream<LLMEvent, LLMError>,
): Effect.Effect<LLMEvent[], LLMError> {
  return Stream.runCollect(stream).pipe(
    Effect.map((chunk) => [...chunk]),
  )
}

const textEvent: LLMEvent = {
  type: "text-delta",
  id: "t1",
  text: "hello",
} as any

const finishEvent: LLMEvent = {
  type: "finish",
  reason: "stop",
} as any

const retryableError = new LLMError({
  module: "Test",
  method: "stream",
  reason: new RateLimitReason({ message: "rate limited" }),
})

const nonRetryableError = new LLMError({
  module: "Test",
  method: "stream",
  reason: new InvalidRequestReason({ message: "bad request" }),
})

describe("withRetry", () => {
  it("passes through a successful stream without retrying", async () => {
    const adapter: LLMAdapter = {
      stream: () => Stream.fromIterable([textEvent, finishEvent] as any),
    }

    const result = await Effect.runPromise(
      collectEvents(
        withRetry(adapter, { maxRetries: 2 }).stream({} as any),
      ),
    )

    assert.equal(result.length, 2)
    assert.equal(result[0], textEvent)
    assert.equal(result[1], finishEvent)
  })

  it("retries on retryable error before any events", async () => {
    let attempts = 0
    const adapter: LLMAdapter = {
      stream: () => {
        attempts++
        if (attempts < 2) return Stream.fail(retryableError)
        return Stream.fromIterable([finishEvent] as any)
      },
    }

    const result = await Effect.runPromise(
      collectEvents(
        withRetry(adapter, { maxRetries: 3, baseDelayMs: 5 }).stream(
          {} as any,
        ),
      ),
    )

    assert.equal(attempts, 2)
    assert.equal(result.length, 1)
  })

  it("does not retry on non-retryable error", async () => {
    let attempts = 0
    const adapter: LLMAdapter = {
      stream: () => {
        attempts++
        return Stream.fail(nonRetryableError)
      },
    }

    const error = await Effect.runPromise(
      Effect.flip(
        collectEvents(
          withRetry(adapter, { maxRetries: 3, baseDelayMs: 5 }).stream(
            {} as any,
          ),
        ),
      ),
    )

    assert.equal(attempts, 1)
    assert(error instanceof LLMError)
    assert(error.reason instanceof InvalidRequestReason)
  })

  it("does not retry if signal is already aborted", async () => {
    const controller = new AbortController()
    controller.abort()
    let attempts = 0

    const adapter: LLMAdapter = {
      stream: () => {
        attempts++
        return Stream.fail(retryableError)
      },
    }

    const error = await Effect.runPromise(
      Effect.flip(
        collectEvents(
          withRetry(adapter, { maxRetries: 3, baseDelayMs: 5 }).stream(
            {} as any,
            controller.signal,
          ),
        ),
      ),
    )

    assert.equal(attempts, 1)
    assert(error instanceof LLMError)
  })

  it("respects retryAfterMs from error", async () => {
    const errorWithDelay = new LLMError({
      module: "Test",
      method: "stream",
      reason: new RateLimitReason({
        message: "slow down",
        retryAfterMs: 3,
      }),
    })

    let attempts = 0
    const adapter: LLMAdapter = {
      stream: () => {
        attempts++
        if (attempts < 2) return Stream.fail(errorWithDelay)
        return Stream.fromIterable([finishEvent] as any)
      },
    }

    const start = Date.now()
    await Effect.runPromise(
      collectEvents(
        withRetry(adapter, { maxRetries: 3, baseDelayMs: 10000 }).stream(
          {} as any,
        ),
      ),
    )
    const elapsed = Date.now() - start

    assert.equal(attempts, 2)
    assert(elapsed < 5000)
  })

  it("does NOT retry if events were already emitted", async () => {
    let attempts = 0
    const adapter: LLMAdapter = {
      stream: () => {
        attempts++
        return Stream.unfoldEffect(0, (state) => {
          if (state === 0) {
            return Effect.succeed(Option.some([textEvent as any, 1]))
          }
          return Effect.fail(retryableError)
        })
      },
    }

    const result = await Effect.runPromise(
      Effect.flip(
        collectEvents(
          withRetry(adapter, { maxRetries: 3, baseDelayMs: 5 }).stream(
            {} as any,
          ),
        ),
      ),
    )

    assert.equal(attempts, 1)
  })
})
