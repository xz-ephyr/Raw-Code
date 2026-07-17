import type { LLMEvent, SystemPart, ToolDefinition } from "../schema"
import { Usage } from "../schema"
import type { OpenAIChatContentPart, OpenAIToolDefinition } from "./openai-types"

export const convertContentPart = (part: any): OpenAIChatContentPart | undefined => {
  switch (part.type) {
    case "text":
      return { type: "text", text: part.text }
    case "media":
      if (typeof part.mediaType === "string" && part.mediaType.startsWith("image/")) {
        return { type: "image_url", image_url: { url: typeof part.data === "string" ? part.data : "" } }
      }
      return undefined
    default:
      return undefined
  }
}

export const safeStringify = (value: unknown): string => {
  try { return JSON.stringify(value) } catch { return String(value) }
}

export const convertSystemParts = (parts: ReadonlyArray<SystemPart>): string =>
  parts.map((p) => p.text).join("\n")

export const convertToolDefinition = (tool: ToolDefinition): OpenAIToolDefinition => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema as Record<string, unknown>,
  },
})

export const convertToolChoice = (choice: unknown): string | { type: "function"; function: { name: string } } | undefined => {
  if (!choice) return undefined
  if (typeof choice === "string") return choice
  const c = choice as any
  if (c.type === "tool" && c.name) return { type: "function", function: { name: c.name } }
  if (c.type === "auto") return "auto"
  if (c.type === "none") return "none"
  if (c.type === "required") return "required"
  return undefined
}

export const textStartEvent = (id: string): LLMEvent => ({ type: "text-start", id } as any)
export const textStartId = (index: number) => `text:${index}`
export const textDeltaEvent = (id: string, text: string): LLMEvent => ({ type: "text-delta", id, text } as any)
export const reasoningStartEvent = (id: string): LLMEvent => ({ type: "reasoning-start", id } as any)
export const reasoningStartId = (index: number) => `reasoning:${index}`
export const reasoningDeltaEvent = (id: string, text: string): LLMEvent => ({ type: "reasoning-delta", id, text } as any)
export const toolInputStartEvent = (id: string, name: string): LLMEvent => ({ type: "tool-input-start", id, name } as any)
export const toolInputStartId = (index: number, tcIndex: number) => `tool:${index}:${tcIndex}`
export const toolInputDeltaEvent = (id: string, text: string): LLMEvent => ({ type: "tool-input-delta", id, text } as any)
export const toolInputEndEvent = (id: string, name: string): LLMEvent => ({ type: "tool-input-end", id, name } as any)
export const toolCallEvent = (id: string, name: string, input: unknown): LLMEvent => ({ type: "tool-call", id, name, input } as any)
export const stepStartEvent = (index: number): LLMEvent => ({ type: "step-start", index } as any)
export const stepFinishEvent = (index: number, reason: any, usage?: Usage): LLMEvent => ({ type: "step-finish", index, reason, ...(usage ? { usage } : {}) } as any)
export const finishEvent = (reason: any, usage?: Usage): LLMEvent => ({ type: "finish", reason, ...(usage ? { usage } : {}) } as any)

export function mapFinishReason(reason: string): any {
  switch (reason) {
    case "stop": return "stop"
    case "length": return "length"
    case "tool_calls": return "tool-calls"
    case "content_filter": return "content-filter"
    default: return "unknown"
  }
}
