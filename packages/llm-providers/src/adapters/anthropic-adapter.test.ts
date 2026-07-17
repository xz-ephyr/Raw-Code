import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { Effect } from "effect"
import { AnthropicProtocol } from "../protocols/anthropic-messages"
import type { AnthropicState } from "../protocols/anthropic-messages"
import { createSSEParser, type SSEMessage } from "../route/sse-parser"
import type { LLMEvent } from "../schema/event-schemas"

function processBatch(
  state: AnthropicState,
  msgs: ReadonlyArray<SSEMessage>,
): { state: AnthropicState; events: ReadonlyArray<LLMEvent> } {
  const step = AnthropicProtocol.stream.step
  let s = state
  const events: Array<LLMEvent> = []

  for (const msg of msgs) {
    if (msg.data === "[DONE]") continue
    let event: any
    try { event = JSON.parse(msg.data) } catch { continue }
    const [newState, evts] = Effect.runSync(step(s, event))
    s = newState as any
    events.push(...evts)
  }

  return { state: s as any, events }
}

describe("AnthropicAdapter", () => {
  it("maps message_start to step-start event", () => {
    const initialState = AnthropicProtocol.stream.initial({} as any)
    const msgs: SSEMessage[] = [
      {
        event: "message_start",
        data: JSON.stringify({
          type: "message_start",
          message: { id: "msg_1", model: "claude-3", usage: { input_tokens: 10, output_tokens: 0 } },
        }),
      },
    ]
    const { events } = processBatch(initialState, msgs)
    assert.equal(events.length, 1)
    assert.equal(events[0].type, "step-start")
    assert.equal((events[0] as any).index, 0)
  })

  it("maps content_block_start text to text-start", () => {
    const initialState = AnthropicProtocol.stream.initial({} as any)
    const msgs: SSEMessage[] = [
      {
        event: "content_block_start",
        data: JSON.stringify({
          type: "content_block_start",
          index: 0,
          content_block: { type: "text", text: "" },
        }),
      },
      {
        event: "content_block_delta",
        data: JSON.stringify({
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "Hello" },
        }),
      },
      {
        event: "content_block_stop",
        data: JSON.stringify({ type: "content_block_stop", index: 0 }),
      },
    ]
    const { events } = processBatch(initialState, msgs)

    const textStart = events.find((e) => e.type === "text-start")
    assert.ok(textStart, "expected text-start event")

    const textDeltas = events.filter((e) => e.type === "text-delta")
    assert.equal(textDeltas.length, 1)
    assert.equal((textDeltas[0] as any).text, "Hello")

    const textEnd = events.find((e) => e.type === "text-end")
    assert.ok(textEnd, "expected text-end event")
  })

  it("maps tool_use content block to tool-input events", () => {
    const initialState = AnthropicProtocol.stream.initial({} as any)
    const msgs: SSEMessage[] = [
      {
        event: "content_block_start",
        data: JSON.stringify({
          type: "content_block_start",
          index: 0,
          content_block: { type: "tool_use", id: "tu_1", name: "get_weather", input: {} },
        }),
      },
      {
        event: "content_block_delta",
        data: JSON.stringify({
          type: "content_block_delta",
          index: 0,
          delta: { type: "input_json_delta", partial_json: '{"city"' },
        }),
      },
      {
        event: "content_block_delta",
        data: JSON.stringify({
          type: "content_block_delta",
          index: 0,
          delta: { type: "input_json_delta", partial_json: ':"London"}' },
        }),
      },
      {
        event: "content_block_stop",
        data: JSON.stringify({ type: "content_block_stop", index: 0 }),
      },
    ]
    const { events } = processBatch(initialState, msgs)

    const toolInputStart = events.find((e) => e.type === "tool-input-start")
    assert.ok(toolInputStart, "expected tool-input-start")
    assert.equal((toolInputStart as any).name, "get_weather")

    const toolInputDeltas = events.filter((e) => e.type === "tool-input-delta")
    assert.equal(toolInputDeltas.length, 2)
    assert.equal((toolInputDeltas[0] as any).text, '{"city"')
    assert.equal((toolInputDeltas[1] as any).text, ':"London"}')

    const toolCall = events.find((e) => e.type === "tool-call")
    assert.ok(toolCall, "expected tool-call")
    assert.deepEqual((toolCall as any).input, { city: "London" })
  })

  it("maps message_delta to step-finish and finish", () => {
    const initialState = AnthropicProtocol.stream.initial({} as any)
    const msgs: SSEMessage[] = [
      {
        event: "message_start",
        data: JSON.stringify({
          type: "message_start",
          message: { id: "msg_1", model: "claude-3", usage: { input_tokens: 10, output_tokens: 0 } },
        }),
      },
      {
        event: "message_delta",
        data: JSON.stringify({
          type: "message_delta",
          delta: { stop_reason: "end_turn", stop_sequence: null },
          usage: { output_tokens: 50 },
        }),
      },
    ]
    const { events } = processBatch(initialState, msgs)

    const stepFinish = events.find((e) => e.type === "step-finish")
    assert.ok(stepFinish, "expected step-finish")
    assert.equal((stepFinish as any).reason, "stop")
    assert.ok((stepFinish as any).usage, "expected usage on step-finish")

    const finish = events.find((e) => e.type === "finish")
    assert.ok(finish, "expected finish")
    assert.equal((finish as any).reason, "stop")
  })

  it("ignores ping events", () => {
    const initialState = AnthropicProtocol.stream.initial({} as any)
    const msgs: SSEMessage[] = [
      { event: "ping", data: JSON.stringify({ type: "ping" }) },
    ]
    const { events } = processBatch(initialState, msgs)
    assert.equal(events.length, 0)
  })

  it("skips DONE sentinel without producing events", () => {
    const initialState = AnthropicProtocol.stream.initial({} as any)
    const msgs: SSEMessage[] = [{ data: "[DONE]", event: "done" }]
    const { events } = processBatch(initialState, msgs)
    assert.equal(events.length, 0)
  })

  it("handles full Anthropic stream end-to-end through SSEParser", () => {
    const encoder = new TextEncoder()
    const parser = createSSEParser()
    const initialState = AnthropicProtocol.stream.initial({} as any)
    let state = initialState
    const allEvents: LLMEvent[] = []

    const rawSSE = [
      'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_1","model":"claude-3","usage":{"input_tokens":5,"output_tokens":0}}}\n\n',
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}\n\n',
      'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
      'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":10}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ]

    for (const chunk of rawSSE) {
      const msgs = parser.push(encoder.encode(chunk))
      if (msgs.length > 0) {
        const result = processBatch(state, msgs)
        state = result.state
        allEvents.push(...result.events)
      }
    }

    const msgs = parser.flush()
    if (msgs.length > 0) {
      const result = processBatch(state, msgs)
      allEvents.push(...result.events)
    }

    const stepStart = allEvents.find((e) => e.type === "step-start")
    assert.ok(stepStart, "expected step-start")

    const textStart = allEvents.find((e) => e.type === "text-start")
    assert.ok(textStart, "expected text-start")

    const textDelta = allEvents.find((e) => e.type === "text-delta") as any
    assert.ok(textDelta, "expected text-delta")
    assert.equal(textDelta.text, "Hi")

    const textEnd = allEvents.find((e) => e.type === "text-end")
    assert.ok(textEnd, "expected text-end")

    const finish = allEvents.find((e) => e.type === "finish") as any
    assert.ok(finish, "expected finish")
    assert.equal(finish.reason, "stop")
  })
})
