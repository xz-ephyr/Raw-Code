import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { injectThinkTool } from "./think-tool-inject"
import { makeToolDefinition } from "../schema/messages"

const fakeTool = makeToolDefinition({
  name: "get_weather",
  description: "Get weather",
  inputSchema: { type: "object", properties: { city: { type: "string" } } },
})

const fakeTool2 = makeToolDefinition({
  name: "search",
  description: "Search",
  inputSchema: { type: "object", properties: { query: { type: "string" } } },
})

describe("injectThinkTool", () => {
  it("adds think tool when needsThinkTool is true", () => {
    const result = injectThinkTool([fakeTool], true)
    assert.equal(result.length, 2)
    assert.equal(result[1].name, "think")
    assert.equal(result[1].description, "Use to reason step-by-step before acting, especially before calling another tool or when re-evaluating a result. This does not perform any action.")
  })

  it("does not add think tool when needsThinkTool is false", () => {
    const result = injectThinkTool([fakeTool], false)
    assert.equal(result.length, 1)
    assert.equal(result[0].name, "get_weather")
  })

  it("does not duplicate think tool if already present", () => {
    const thinkTool = makeToolDefinition({
      name: "think",
      description: "Already exists",
      inputSchema: { type: "object", properties: {} },
    })
    const result = injectThinkTool([fakeTool, thinkTool], true)
    assert.equal(result.length, 2)
    const thinkCount = result.filter((t) => t.name === "think").length
    assert.equal(thinkCount, 1)
  })

  it("does not mutate original tools array", () => {
    const original = [fakeTool]
    const result = injectThinkTool(original, true)
    assert.equal(original.length, 1)
    assert.equal(result.length, 2)
  })

  it("returns copy of tools even when no injection needed", () => {
    const original = [fakeTool]
    const result = injectThinkTool(original, false)
    assert.notEqual(result, original)
    assert.equal(result.length, 1)
  })

  it("preserves existing tools order", () => {
    const result = injectThinkTool([fakeTool, fakeTool2], true)
    assert.equal(result[0].name, "get_weather")
    assert.equal(result[1].name, "search")
    assert.equal(result[2].name, "think")
  })

  it("handles empty tools array", () => {
    const result = injectThinkTool([], true)
    assert.equal(result.length, 1)
    assert.equal(result[0].name, "think")
  })

  it("think tool has correct inputSchema structure", () => {
    const result = injectThinkTool([], true)
    const thinkDef = result[0]
    const schema = thinkDef.inputSchema as any
    assert.equal(schema.type, "object")
    assert.deepEqual(schema.required, ["thought"])
    assert.equal(schema.properties.thought.type, "string")
  })
})
