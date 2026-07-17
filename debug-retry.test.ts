import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { Stream, Effect } from "effect"
import { withRetry } from "./packages/llm-providers/src/adapters/with-retry"
import { LLMError, RateLimitReason } from "./packages/llm-providers/src/schema"

describe("debug", () => {
  it("simple stream", async () => {
    const collected = await Effect.runPromise(Stream.runCollect(Stream.fromIterable([1, 2, 3])))
    assert.equal([...collected].length, 3)
  })

  it("withRetry calls adapter", async () => {
    let calls = 0
    const adapter = {
      stream: () => {
        calls++
        if (calls === 1) {
          return Stream.fail(
            new LLMError({ module: "T", method: "m", reason: new RateLimitReason({ message: "x" }) }),
          )
        }
        return Stream.fromIterable([{ type: "text-delta", id: "t1", text: "ok" }] as any)
      },
    }

    const result = await Effect.runPromise(
      Effect.catchAll(
        Stream.runCollect(
          withRetry(adapter, { maxRetries: 1, baseDelayMs: 5 }).stream({} as any) as any,
        ),
        () => Effect.succeed([] as any),
      ),
    )
    console.log("calls:", calls, "result length:", (result as any).length)
    assert.equal(calls, 2)
  })
})
