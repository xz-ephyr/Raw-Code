import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { createSSEParser } from "./sse-parser"

function encode(s: string) {
  return new TextEncoder().encode(s)
}

describe("SSEParser", () => {
  it("handles two complete events in one chunk", () => {
    const p = createSSEParser()
    const chunk = 'data: {"a":1}\n\ndata: {"b":2}\n\n'
    const msgs = p.push(encode(chunk))
    assert.equal(msgs.length, 2)
    assert.equal(msgs[0].data, '{"a":1}')
    assert.equal(msgs[1].data, '{"b":2}')
  })

  it("handles an event split across two chunks", () => {
    const p = createSSEParser()
    const msgs1 = p.push(encode('data: {"a":'))
    assert.equal(msgs1.length, 0)
    const msgs2 = p.push(encode('1}\n\n'))
    assert.equal(msgs2.length, 1)
    assert.equal(msgs2[0].data, '{"a":1}')
  })

  it("handles double-newline boundary split across chunks", () => {
    const p = createSSEParser()
    const msgs1 = p.push(encode('data: hello\n'))
    assert.equal(msgs1.length, 0)
    const msgs2 = p.push(encode('\ndata: world\n\n'))
    assert.equal(msgs2.length, 2)
    assert.equal(msgs2[0].data, "hello")
    assert.equal(msgs2[1].data, "world")
  })

  it("parses Anthropic-style event with event field", () => {
    const p = createSSEParser()
    const chunk = 'event: message_start\ndata: {"type":"message_start"}\n\n'
    const msgs = p.push(encode(chunk))
    assert.equal(msgs.length, 1)
    assert.equal(msgs[0].event, "message_start")
    assert.equal(msgs[0].data, '{"type":"message_start"}')
  })

  it("preserves the DONE sentinel", () => {
    const p = createSSEParser()
    const chunk = 'data: {"a":1}\n\ndata: [DONE]\n\n'
    const msgs = p.push(encode(chunk))
    assert.equal(msgs.length, 2)
    assert.equal(msgs[0].data, '{"a":1}')
    assert.equal(msgs[1].data, "[DONE]")
    assert.equal(msgs[1].event, "done")
  })

  it("flush with partial data yields nothing", () => {
    const p = createSSEParser()
    assert.equal(p.push(encode('data: incomplete')).length, 0)
    assert.equal(p.flush().length, 0)
  })

  it("handles multi-byte UTF-8 split across chunk boundaries", () => {
    const p = createSSEParser()
    const head = new Uint8Array([0x64, 0x61, 0x74, 0x61, 0x3a, 0x20, 0xf0, 0x9f])
    const tail = new Uint8Array([0x94, 0xa5, 0x0a, 0x0a])
    assert.equal(p.push(head).length, 0)
    const msgs = p.push(tail)
    assert.equal(msgs.length, 1)
    assert.equal(msgs[0].data, "🔥")
  })

  it("ignores SSE comment heartbeats", () => {
    const p = createSSEParser()
    const chunk = ': heartbeat\n\ndata: {"ok":true}\n\n'
    const msgs = p.push(encode(chunk))
    assert.equal(msgs.length, 1)
    assert.equal(msgs[0].data, '{"ok":true}')
  })

  it("parses id field", () => {
    const p = createSSEParser()
    const chunk = 'id: 42\ndata: {"x":1}\n\n'
    const msgs = p.push(encode(chunk))
    assert.equal(msgs.length, 1)
    assert.equal(msgs[0].id, "42")
    assert.equal(msgs[0].data, '{"x":1}')
  })

  it("handles multiple empty chunks gracefully", () => {
    const p = createSSEParser()
    assert.equal(p.push(new Uint8Array(0)).length, 0)
    assert.equal(p.push(new Uint8Array(0)).length, 0)
    assert.equal(p.flush().length, 0)
  })

  it("handles real OpenAI-style stream output", () => {
    const p = createSSEParser()
    const chunk = 'data: {"choices":[{"delta":{"role":"assistant","content":""},"index":0}],"usage":null}\n\ndata: {"choices":[{"delta":{"content":"Hello"},"index":0}]}\n\ndata: [DONE]\n\n'
    const msgs = p.push(encode(chunk))
    assert.equal(msgs.length, 3)
    assert.equal(msgs[1].data.includes("Hello"), true)
    assert.equal(msgs[2].data, "[DONE]")
  })
})
