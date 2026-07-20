import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { Effect, Schema } from "effect"
import { thinkTool } from "./think"
import { getToolRuntime } from "../tool/make"

function makeContext() {
  return {
    sessionID: "test-session",
    agentID: "test-agent",
    assistantMessageID: "test-msg",
    toolCallID: "test-call",
  }
}

describe("thinkTool", () => {
  it("has correct name and description", () => {
    const runtime = getToolRuntime(thinkTool)
    assert.ok(runtime, "thinkTool should have runtime")
    assert.ok(runtime.description.includes("reason step-by-step"))
  })

  it("accepts a thought string input", async () => {
    const runtime = getToolRuntime(thinkTool)
    assert.ok(runtime, "thinkTool should have runtime")

    const decoded = await Effect.runPromise(
      Schema.decodeUnknown(runtime.inputSchema)({ thought: "I should search for buses" })
    )
    assert.equal(decoded.thought, "I should search for buses")
  })

  it("rejects input without thought field", async () => {
    const runtime = getToolRuntime(thinkTool)
    assert.ok(runtime, "thinkTool should have runtime")

    await assert.rejects(
      Effect.runPromise(Schema.decodeUnknown(runtime.inputSchema)({})),
      /is missing/,
    )
  })

  it("executes and returns Noted. acknowledgement", async () => {
    const runtime = getToolRuntime(thinkTool)
    assert.ok(runtime, "thinkTool should have runtime")

    const result = await Effect.runPromise(
      runtime.execute({ thought: "testing" }, makeContext())
    )
    assert.deepEqual(result, { acknowledged: "Noted." })
  })

  it("has inputJsonSchema with thought as required string", () => {
    const runtime = getToolRuntime(thinkTool)
    assert.ok(runtime, "thinkTool should have runtime")
    assert.ok(runtime.inputJsonSchema, "should have inputJsonSchema")

    const schema = runtime.inputJsonSchema!
    assert.equal(schema.type, "object")
    assert.deepEqual(schema.required, ["thought"])
    assert.equal(schema.properties.thought.type, "string")
  })

  it("does not mutate state or have side effects", async () => {
    const runtime = getToolRuntime(thinkTool)
    assert.ok(runtime, "thinkTool should have runtime")

    const result1 = await Effect.runPromise(
      runtime.execute({ thought: "first" }, makeContext())
    )
    const result2 = await Effect.runPromise(
      runtime.execute({ thought: "second" }, makeContext())
    )
    assert.deepEqual(result1, { acknowledged: "Noted." })
    assert.deepEqual(result2, { acknowledged: "Noted." })
  })
})
