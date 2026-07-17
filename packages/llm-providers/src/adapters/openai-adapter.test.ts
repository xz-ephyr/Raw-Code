import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { Effect } from "effect"
import { OpenAIProtocol } from "../protocols/openai-chat"
import { createSSEParser } from "../route/sse-parser"
import { Model } from "../schema/options"
import { LLMError, LLMRequest as LLMRequestClass, userMessage } from "../schema"
import type { OpenAIStreamEvent } from "../protocols/openai-types"
import type { LLMEvent } from "../schema/event-schemas"

const baseRequest = new LLMRequestClass({
  model: Model.make({ id: "gpt-4o", provider: "openai", route: {} }),
  messages: [userMessage("hi")],
  system: [],
  tools: [],
})

function sse(data: string): string {
  return `data: ${data}\n\n`
}

function done(): string {
  return `data: [DONE]\n\n`
}

function chunk(overrides: Partial<OpenAIStreamEvent>): string {
  const base = {
    id: "chatcmpl-123",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        delta: {} as any,
        finish_reason: null,
      },
    ],
  }
  return JSON.stringify({ ...base, ...overrides, choices: overrides.choices ?? base.choices })
}

function process(raw: string): Effect.Effect<ReadonlyArray<any>, LLMError> {
  const parser = createSSEParser()
  const events: Array<LLMEvent> = []

  const step = OpenAIProtocol.stream.step
  let state = OpenAIProtocol.stream.initial(baseRequest)

  const bytes = new TextEncoder().encode(raw)
  const parsed = parser.push(bytes)
  const flushed = parser.flush()

  return Effect.gen(function* () {
    for (const msg of [...parsed, ...flushed]) {
      if (msg.data === "[DONE]") continue
      const event = JSON.parse(msg.data) as OpenAIStreamEvent
      const [newState, evts] = yield* step(state, event as any)
      state = newState as any
      events.push(...evts)
    }
    return events
  })
}

describe("OpenAI Adapter — Protocol (step function)", () => {
  it("produces text-start/delta/end + finish from simple text stream", async () => {
    const raw =
      sse(chunk({ choices: [{ index: 0, delta: { content: "Hello" }, finish_reason: null }] })) +
      sse(chunk({ choices: [{ index: 0, delta: { content: " world" }, finish_reason: null }] })) +
      sse(
        chunk({
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      ) +
      done()

    const result = await Effect.runPromise(process(raw))

    assert.ok(result.some((e: any) => e.type === "step-start"))
    assert.ok(result.some((e: any) => e.type === "text-start"))
    const deltas = result.filter((e: any) => e.type === "text-delta")
    assert.equal(deltas.length, 2)
    assert.equal(deltas[0].text, "Hello")
    assert.equal(deltas[1].text, " world")
    assert.ok(result.some((e: any) => e.type === "text-end"))
    const finish = result.find((e: any) => e.type === "finish") as any
    assert.ok(finish)
    assert.equal(finish.reason, "stop")
    assert.ok(finish.usage)
  })

  it("produces reasoning-start/delta/end for reasoning_content", async () => {
    const raw =
      sse(chunk({ choices: [{ index: 0, delta: { reasoning_content: "Think" }, finish_reason: null }] })) +
      sse(chunk({ choices: [{ index: 0, delta: { reasoning_content: "ing" }, finish_reason: null }] })) +
      sse(chunk({ choices: [{ index: 0, delta: { content: "Answer" }, finish_reason: null }] })) +
      sse(chunk({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })) +
      done()

    const result = await Effect.runPromise(process(raw))

    assert.ok(result.some((e: any) => e.type === "reasoning-start"))
    const rDeltas = result.filter((e: any) => e.type === "reasoning-delta")
    assert.equal(rDeltas.length, 2)
    assert.equal(rDeltas[0].text, "Think")
    assert.equal(rDeltas[1].text, "ing")
    assert.ok(result.some((e: any) => e.type === "reasoning-end"))
    assert.ok(result.some((e: any) => e.type === "text-start"))
    assert.ok(result.some((e: any) => e.type === "text-end"))
  })

  it("handles tool calls with incremental arguments", async () => {
    const raw =
      sse(
        chunk({
          choices: [
            {
              index: 0,
              delta: {
                role: "assistant",
                content: null,
                tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "get_weather", arguments: "" } }],
              },
              finish_reason: null,
            },
          ],
        }),
      ) +
      sse(
        chunk({
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [{ index: 0, function: { arguments: '{"cit' } }],
              },
              finish_reason: null,
            },
          ],
        }),
      ) +
      sse(
        chunk({
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [{ index: 0, function: { arguments: 'y":"London"}' } }],
              },
              finish_reason: null,
            },
          ],
        }),
      ) +
      sse(
        chunk({
          choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
          usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
        }),
      ) +
      done()

    const result = await Effect.runPromise(process(raw))

    assert.ok(result.some((e: any) => e.type === "tool-input-start"))
    const inputDeltas = result.filter((e: any) => e.type === "tool-input-delta")
    assert.equal(inputDeltas.length, 2)
    assert.ok(result.some((e: any) => e.type === "tool-input-end"))
    const toolCalls = result.filter((e: any) => e.type === "tool-call")
    assert.equal(toolCalls.length, 1)
    assert.equal(toolCalls[0].name, "get_weather")
    assert.deepEqual(toolCalls[0].input, { city: "London" })
  })

  it("emits step-start only on first content delta", async () => {
    const raw =
      sse(chunk({ choices: [{ index: 0, delta: { content: "A" }, finish_reason: null }] })) +
      sse(chunk({ choices: [{ index: 0, delta: { content: "B" }, finish_reason: null }] })) +
      sse(chunk({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })) +
      done()

    const result = await Effect.runPromise(process(raw))
    const stepStarts = result.filter((e: any) => e.type === "step-start")
    assert.equal(stepStarts.length, 1)
  })

  it("handles stream with just finish_reason (no content)", async () => {
    const raw =
      sse(chunk({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })) +
      done()

    const result = await Effect.runPromise(process(raw))
    const finish = result.find((e: any) => e.type === "finish") as any
    assert.ok(finish)
    assert.equal(finish.reason, "stop")
    assert.equal(result.length, 2) // step-finish + finish
  })

  it("multiple tool calls in one stream", async () => {
    const raw =
      sse(
        chunk({
          choices: [
            {
              index: 0,
              delta: {
                role: "assistant",
                content: null,
                tool_calls: [
                  { index: 0, id: "call_1", type: "function", function: { name: "get_weather", arguments: "" } },
                  { index: 1, id: "call_2", type: "function", function: { name: "get_time", arguments: "" } },
                ],
              },
              finish_reason: null,
            },
          ],
        }),
      ) +
      sse(
        chunk({
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  { index: 0, function: { arguments: '{"city":"Paris"}' } },
                  { index: 1, function: { arguments: '{"tz":"UTC"}' } },
                ],
              },
              finish_reason: null,
            },
          ],
        }),
      ) +
      sse(
        chunk({
          choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
        }),
      ) +
      done()

    const result = await Effect.runPromise(process(raw))
    const toolCalls = result.filter((e: any) => e.type === "tool-call")
    assert.equal(toolCalls.length, 2)
    assert.equal(toolCalls[0].name, "get_weather")
    assert.equal(toolCalls[1].name, "get_time")
    assert.deepEqual(toolCalls[0].input, { city: "Paris" })
    assert.deepEqual(toolCalls[1].input, { tz: "UTC" })
  })

  it("fragmented JSON in tool call arguments", async () => {
    const raw =
      sse(
        chunk({
          choices: [
            {
              index: 0,
              delta: {
                role: "assistant",
                content: null,
                tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "search", arguments: "" } }],
              },
              finish_reason: null,
            },
          ],
        }),
      ) +
      sse(
        chunk({
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [{ index: 0, function: { arguments: '{"q":' } }],
              },
              finish_reason: null,
            },
          ],
        }),
      ) +
      sse(
        chunk({
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [{ index: 0, function: { arguments: '"hello"' } }],
              },
              finish_reason: null,
            },
          ],
        }),
      ) +
      sse(
        chunk({
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [{ index: 0, function: { arguments: "}" } }],
              },
              finish_reason: null,
            },
          ],
        }),
      ) +
      sse(
        chunk({
          choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
        }),
      ) +
      done()

    const result = await Effect.runPromise(process(raw))
    const toolCalls = result.filter((e: any) => e.type === "tool-call")
    assert.equal(toolCalls.length, 1)
    assert.deepEqual(toolCalls[0].input, { q: "hello" })
  })
})
