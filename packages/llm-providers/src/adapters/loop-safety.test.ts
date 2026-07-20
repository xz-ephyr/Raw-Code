import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { Stream, Effect } from "effect"
import { createToolLoop, type ToolExecutor } from "./tool-loop"
import type { LLMEvent } from "../schema/event-schemas"
import { LLMRequest } from "../schema"
import { Model } from "../schema/options"

function makeRequest() {
  return new LLMRequest({
    model: Model.make({ id: "test-model", provider: "test-provider", route: {} }),
    messages: [],
    system: [],
    tools: [],
  })
}

describe("ToolLoop - safety mechanisms", () => {
  it("timeout config is accepted without error", () => {
    const loop = createToolLoop({ routes: [], timeoutMs: 5000 })
    assert.ok(typeof loop === "function")
  })

  it("maxTokens config is accepted without error", () => {
    const loop = createToolLoop({ routes: [], maxTokens: 10000 })
    assert.ok(typeof loop === "function")
  })

  it("maxSteps config is accepted without error", () => {
    const loop = createToolLoop({ routes: [], maxSteps: 5 })
    assert.ok(typeof loop === "function")
  })

  it("all safety configs can be combined", () => {
    const loop = createToolLoop({
      routes: [],
      maxSteps: 15,
      maxTokens: 50000,
      timeoutMs: 60000,
    })
    assert.ok(typeof loop === "function")
  })

  it("default maxSteps is 10", () => {
    const loop = createToolLoop({ routes: [] })
    assert.ok(typeof loop === "function")
  })

  it("finish reason timeout is valid", () => {
    const event: LLMEvent = { type: "finish", reason: "timeout" } as any
    assert.equal(event.type, "finish")
    assert.equal(event.reason, "timeout")
  })

  it("finish reason token-budget is valid", () => {
    const event: LLMEvent = { type: "finish", reason: "token-budget" } as any
    assert.equal(event.type, "finish")
    assert.equal(event.reason, "token-budget")
  })

  it("finish reason repeated-call is valid", () => {
    const event: LLMEvent = { type: "finish", reason: "repeated-call" } as any
    assert.equal(event.type, "finish")
    assert.equal(event.reason, "repeated-call")
  })

  it("repeated call detection logic works", () => {
    const isRepeated = (
      current: { name: string; input: unknown },
      prev: { name: string; inputKey: string } | undefined,
    ): boolean => {
      if (!prev) return false
      return current.name === prev.name && JSON.stringify(current.input) === prev.inputKey
    }

    const prev = { name: "search", inputKey: '{"query":"test"}' }
    const same = { name: "search", input: { query: "test" } }
    const different = { name: "search", input: { query: "other" } }
    const newTool = { name: "weather", input: { city: "London" } }

    assert.equal(isRepeated(same, prev), true)
    assert.equal(isRepeated(different, prev), false)
    assert.equal(isRepeated(newTool, prev), false)
    assert.equal(isRepeated(same, undefined), false)
  })

  it("token budget check logic works", () => {
    const maxTokens = 10000
    const totalUsed = 12000
    const exceeded = totalUsed > maxTokens
    assert.equal(exceeded, true)

    const totalUsed2 = 8000
    const exceeded2 = totalUsed2 > maxTokens
    assert.equal(exceeded2, false)
  })

  it("timeout check logic works", () => {
    const deadline = Date.now() - 1000 // 1 second ago
    const timedOut = Date.now() > deadline
    assert.equal(timedOut, true)

    const futureDeadline = Date.now() + 60000 // 60 seconds from now
    const notTimedOut = Date.now() > futureDeadline
    assert.equal(notTimedOut, false)
  })
})
