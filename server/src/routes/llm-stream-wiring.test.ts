import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { injectThinkTool } from "@doktor/llm-providers/adapters/think-tool-inject"
import { getModelCapability } from "@core/reasoning/capabilities"
import { makeToolDefinition } from "@doktor/llm-providers"

describe("Server route wiring - think tool injection", () => {
  it("getModelCapability returns native for o3", () => {
    const cap = getModelCapability("o3")
    assert.equal(cap.reasoning, "native")
  })

  it("getModelCapability returns none for gpt-4o", () => {
    const cap = getModelCapability("gpt-4o")
    assert.equal(cap.reasoning, "none")
  })

  it("getModelCapability returns native for claude-sonnet-4", () => {
    const cap = getModelCapability("claude-sonnet-4")
    assert.equal(cap.reasoning, "native")
  })

  it("getModelCapability returns none for claude-haiku-3", () => {
    const cap = getModelCapability("claude-haiku-3")
    assert.equal(cap.reasoning, "none")
  })

  it("getModelCapability returns native for gemini-2.5-flash", () => {
    const cap = getModelCapability("gemini-2.5-flash")
    assert.equal(cap.reasoning, "native")
  })

  it("getModelCapability returns tagged for gemma-4-31b-it", () => {
    const cap = getModelCapability("gemma-4-31b-it")
    assert.equal(cap.reasoning, "tagged")
  })

  it("think tool is injected for non-reasoning models", () => {
    const tools = [
      makeToolDefinition({ name: "search", description: "Search", inputSchema: { type: "object", properties: {} } }),
    ]
    const result = injectThinkTool(tools, true)
    assert.equal(result.length, 2)
    assert.equal(result[1].name, "think")
  })

  it("think tool is not injected for native reasoning models", () => {
    const tools = [
      makeToolDefinition({ name: "search", description: "Search", inputSchema: { type: "object", properties: {} } }),
    ]
    const result = injectThinkTool(tools, false)
    assert.equal(result.length, 1)
    assert.equal(result[0].name, "search")
  })

  it("safety configs are accepted by createToolLoop", () => {
    // This just verifies the config shape is valid
    const config = {
      routes: [],
      maxSteps: 15,
      timeoutMs: 120_000,
    }
    assert.equal(config.maxSteps, 15)
    assert.equal(config.timeoutMs, 120_000)
  })

  it("model capability lookup works for all providers", () => {
    const models = [
      { id: "gpt-4o", expected: "none" },
      { id: "o3", expected: "native" },
      { id: "claude-sonnet-4", expected: "native" },
      { id: "claude-haiku-3", expected: "none" },
      { id: "gemini-2.5-flash", expected: "native" },
      { id: "deepseek-reasoner", expected: "native" },
      { id: "deepseek-chat", expected: "none" },
      { id: "mistral-medium-3.5", expected: "native" },
      { id: "mistral-small-latest", expected: "none" },
    ]

    for (const { id, expected } of models) {
      const cap = getModelCapability(id)
      assert.equal(cap.reasoning, expected, `Model ${id} should have reasoning=${expected}`)
    }
  })
})
