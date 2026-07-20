import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  StepStart,
  TextDelta,
  ReasoningDelta,
  ToolCall_,
  ToolResult_,
  Finish,
  StepFinish,
  Intent,
  ProviderErrorEvent,
  UsageEvent,
  Usage,
  LLMEvent,
} from "./event-schemas"

describe("LLMEvent - sourceAgentId field", () => {
  it("StepStart accepts sourceAgentId", () => {
    const event = StepStart.make({ index: 0, sourceAgentId: "agent-1" })
    assert.equal(event.sourceAgentId, "agent-1")
  })

  it("StepStart works without sourceAgentId", () => {
    const event = StepStart.make({ index: 0 })
    assert.equal(event.sourceAgentId, undefined)
  })

  it("TextDelta accepts sourceAgentId", () => {
    const event = TextDelta.make({ id: "t1", text: "hello", sourceAgentId: "agent-2" })
    assert.equal(event.sourceAgentId, "agent-2")
  })

  it("ReasoningDelta accepts sourceAgentId", () => {
    const event = ReasoningDelta.make({ id: "r1", text: "thinking...", sourceAgentId: "agent-3" })
    assert.equal(event.sourceAgentId, "agent-3")
  })

  it("ToolCall_ accepts sourceAgentId", () => {
    const event = ToolCall_.make({
      id: "tc1",
      name: "search",
      input: { query: "test" },
      sourceAgentId: "agent-4",
    })
    assert.equal(event.sourceAgentId, "agent-4")
  })

  it("ToolResult_ accepts sourceAgentId", () => {
    const event = ToolResult_.make({
      id: "tc1",
      name: "search",
      result: { data: "found" },
      sourceAgentId: "agent-5",
    })
    assert.equal(event.sourceAgentId, "agent-5")
  })

  it("Finish accepts sourceAgentId", () => {
    const event = Finish.make({ reason: "stop", sourceAgentId: "agent-6" })
    assert.equal(event.sourceAgentId, "agent-6")
  })

  it("StepFinish accepts sourceAgentId", () => {
    const event = StepFinish.make({ index: 0, reason: "stop", sourceAgentId: "agent-7" })
    assert.equal(event.sourceAgentId, "agent-7")
  })

  it("Intent accepts sourceAgentId", () => {
    const event = Intent.make({
      id: "i1",
      text: "search for weather",
      sourceAgentId: "agent-8",
    })
    assert.equal(event.sourceAgentId, "agent-8")
  })

  it("ProviderErrorEvent accepts sourceAgentId", () => {
    const event = ProviderErrorEvent.make({
      message: "rate limited",
      sourceAgentId: "agent-9",
    })
    assert.equal(event.sourceAgentId, "agent-9")
  })

  it("UsageEvent accepts sourceAgentId", () => {
    const usage = Usage.make({ inputTokens: 100, outputTokens: 50 })
    const event = UsageEvent.make({ usage, sourceAgentId: "agent-10" })
    assert.equal(event.sourceAgentId, "agent-10")
  })

  it("LLMEvent union accepts events with sourceAgentId", () => {
    const events: LLMEvent[] = [
      StepStart.make({ index: 0, sourceAgentId: "team-lead" }),
      TextDelta.make({ id: "t1", text: "hello", sourceAgentId: "writer" }),
      ReasoningDelta.make({ id: "r1", text: "thinking", sourceAgentId: "thinker" }),
      ToolCall_.make({ id: "tc1", name: "search", input: {}, sourceAgentId: "researcher" }),
      Finish.make({ reason: "stop", sourceAgentId: "team-lead" }),
    ]

    assert.equal(events.length, 5)
    assert.equal(events[0].type, "step-start")
    assert.equal(events[1].type, "text-delta")
    assert.equal(events[2].type, "reasoning-delta")
    assert.equal(events[3].type, "tool-call")
    assert.equal(events[4].type, "finish")
  })

  it("LLMEvent union accepts events without sourceAgentId (backwards compatible)", () => {
    const events: LLMEvent[] = [
      StepStart.make({ index: 0 }),
      TextDelta.make({ id: "t1", text: "hello" }),
      Finish.make({ reason: "stop" }),
    ]

    assert.equal(events.length, 3)
    events.forEach((e) => {
      assert.equal((e as any).sourceAgentId, undefined)
    })
  })

  it("events without sourceAgentId still serialize correctly", () => {
    const event = TextDelta.make({ id: "t1", text: "hello" })
    const json = JSON.parse(JSON.stringify(event))
    assert.equal(json.type, "text-delta")
    assert.equal(json.id, "t1")
    assert.equal(json.text, "hello")
    assert.equal("sourceAgentId" in json, false)
  })
})
