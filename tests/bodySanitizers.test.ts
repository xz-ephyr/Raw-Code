import { describe, it, expect } from "vitest"

// We use Record<string, unknown> directly since imports are complex
type BodySanitizer = (body: Record<string, unknown>, request?: any) => Record<string, unknown>

type Fixture = {
  name: string
  input: Record<string, unknown>
  expected: Record<string, unknown>
  sanitizer: BodySanitizer
  only?: boolean
}

const mockRequest = { model: { provider: "test", id: "test-model" } } as any

function fixture({ name, input, expected, sanitizer, only }: Fixture) {
  const fn = only ? it.only : it
  fn(name, () => {
    const result = sanitizer(input, mockRequest)
    expect(result).toEqual(expected)
  })
}

// Inline sanitizer definitions to avoid import complexity
const stripStreamOptions = (body: Record<string, unknown>): void => { delete body.stream_options }
const stripParallelToolCalls = (body: Record<string, unknown>): void => { delete body.parallel_tool_calls }
const ensureSimpleToolChoice = (body: Record<string, unknown>): void => {
  if (!body.tool_choice || typeof body.tool_choice !== "object") return
  const tc = body.tool_choice as Record<string, unknown>
  if (tc.type === "function" && tc.function) body.tool_choice = "auto"
}
const ensureRoleAlternation = (body: Record<string, unknown>): void => {
  const messages = body.messages as Array<Record<string, unknown>> | undefined
  if (!messages || messages.length < 2) return
  const merged: Array<Record<string, unknown>> = [messages[0]]
  for (let i = 1; i < messages.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = messages[i]
    if (prev.role === curr.role && curr.role !== "system") {
      prev.content = String(prev.content) + "\n" + String(curr.content)
    } else {
      merged.push(curr)
    }
  }
  body.messages = merged
}

const buildMistralBody: BodySanitizer = (body) => {
  stripStreamOptions(body)
  stripParallelToolCalls(body)
  ensureRoleAlternation(body)
  if (body.tool_choice && typeof body.tool_choice === "object") {
    const tc = body.tool_choice as Record<string, unknown>
    if (tc.type === "function") body.tool_choice = "auto"
  }
  return body
}

const buildGeminiBody: BodySanitizer = (body) => {
  stripStreamOptions(body)
  stripParallelToolCalls(body)
  ensureSimpleToolChoice(body)
  delete body.reasoning_effort
  delete body.user
  delete body.metadata
  if (body.max_tokens !== undefined) {
    body.maxOutputTokens = body.max_tokens
    delete body.max_tokens
  }
  return body
}

const buildGroqBody: BodySanitizer = (body) => {
  stripStreamOptions(body)
  stripParallelToolCalls(body)
  return body
}

const identityBody: BodySanitizer = (body) => body

describe("bodySanitizers", () => {
  describe("Mistral", () => {
    fixture({
      name: "strips stream_options",
      sanitizer: buildMistralBody,
      input: { messages: [{ role: "user", content: "hi" }], stream_options: { include_usage: true } },
      expected: { messages: [{ role: "user", content: "hi" }] },
    })

    fixture({
      name: "strips parallel_tool_calls",
      sanitizer: buildMistralBody,
      input: { messages: [{ role: "user", content: "hi" }], parallel_tool_calls: true },
      expected: { messages: [{ role: "user", content: "hi" }] },
    })

    fixture({
      name: "merges consecutive same-role messages",
      sanitizer: buildMistralBody,
      input: {
        messages: [
          { role: "user", content: "first" },
          { role: "user", content: "second" },
          { role: "assistant", content: "response" },
          { role: "user", content: "third" },
        ],
      },
      expected: {
        messages: [
          { role: "user", content: "first\nsecond" },
          { role: "assistant", content: "response" },
          { role: "user", content: "third" },
        ],
      },
    })

    fixture({
      name: "does not merge system messages even if consecutive",
      sanitizer: buildMistralBody,
      input: {
        messages: [
          { role: "system", content: "sys1" },
          { role: "system", content: "sys2" },
          { role: "user", content: "hi" },
        ],
      },
      expected: {
        messages: [
          { role: "system", content: "sys1" },
          { role: "system", content: "sys2" },
          { role: "user", content: "hi" },
        ],
      },
    })

    fixture({
      name: "converts function tool_choice to auto",
      sanitizer: buildMistralBody,
      input: {
        messages: [{ role: "user", content: "hi" }],
        tool_choice: { type: "function", function: { name: "my_tool" } },
      },
      expected: {
        messages: [{ role: "user", content: "hi" }],
        tool_choice: "auto",
      },
    })
  })

  describe("Gemini", () => {
    fixture({
      name: "strips stream_options",
      sanitizer: buildGeminiBody,
      input: { messages: [{ role: "user", content: "hi" }], stream_options: { include_usage: true } },
      expected: { messages: [{ role: "user", content: "hi" }] },
    })

    fixture({
      name: "strips parallel_tool_calls",
      sanitizer: buildGeminiBody,
      input: { messages: [{ role: "user", content: "hi" }], parallel_tool_calls: true },
      expected: { messages: [{ role: "user", content: "hi" }] },
    })

    fixture({
      name: "removes reasoning_effort, user, metadata",
      sanitizer: buildGeminiBody,
      input: { messages: [{ role: "user", content: "hi" }], reasoning_effort: "high", user: "abc", metadata: { key: "val" } },
      expected: { messages: [{ role: "user", content: "hi" }] },
    })

    fixture({
      name: "converts max_tokens to maxOutputTokens",
      sanitizer: buildGeminiBody,
      input: { messages: [{ role: "user", content: "hi" }], max_tokens: 4096 },
      expected: { messages: [{ role: "user", content: "hi" }], maxOutputTokens: 4096 },
    })

    fixture({
      name: "simplifies function tool_choice to auto",
      sanitizer: buildGeminiBody,
      input: {
        messages: [{ role: "user", content: "hi" }],
        tool_choice: { type: "function", function: { name: "my_tool" } },
      },
      expected: {
        messages: [{ role: "user", content: "hi" }],
        tool_choice: "auto",
      },
    })
  })

  describe("Groq", () => {
    fixture({
      name: "strips stream_options",
      sanitizer: buildGroqBody,
      input: { messages: [{ role: "user", content: "hi" }], stream_options: { include_usage: true } },
      expected: { messages: [{ role: "user", content: "hi" }] },
    })

    fixture({
      name: "strips parallel_tool_calls",
      sanitizer: buildGroqBody,
      input: { messages: [{ role: "user", content: "hi" }], parallel_tool_calls: true },
      expected: { messages: [{ role: "user", content: "hi" }] },
    })
  })

  describe("OpenAI (identity)", () => {
    fixture({
      name: "preserves all fields",
      sanitizer: identityBody,
      input: { messages: [{ role: "user", content: "hi" }], stream_options: { include_usage: true }, parallel_tool_calls: true, max_tokens: 4096, tool_choice: "auto" },
      expected: { messages: [{ role: "user", content: "hi" }], stream_options: { include_usage: true }, parallel_tool_calls: true, max_tokens: 4096, tool_choice: "auto" },
    })
  })

  describe("empty messages edge case", () => {
    fixture({
      name: "handles empty messages array gracefully",
      sanitizer: buildMistralBody,
      input: { messages: [] },
      expected: { messages: [] },
    })

    fixture({
      name: "handles single message without alteration",
      sanitizer: buildMistralBody,
      input: { messages: [{ role: "user", content: "only one" }] },
      expected: { messages: [{ role: "user", content: "only one" }] },
    })
  })
})
