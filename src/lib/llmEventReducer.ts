import type { LLMEvent } from "@doktor/llm-providers"

export interface ActionItem {
  id: string
  type: "tool_call" | "search" | "fetch" | "thinking" | "custom"
  label: string
  description?: string
  status: "pending" | "active" | "complete" | "error"
  input?: unknown
  result?: unknown
  error?: string
  timestamp?: number
  duration?: number
}

export interface ActionSummary {
  summary: string
  actions: ActionItem[]
}

export interface AssistantMessage {
  id: string
  role: "assistant"
  content: string
  reasoning: string
  toolCalls: ToolCallState[]
  actionSummary?: ActionSummary
  createdAt: number
  finishReason?: string
}

export interface ToolCallState {
  id: string
  name: string
  input: unknown
  result?: unknown
  error?: string
  status: "streaming" | "complete" | "error"
}

export interface StreamState {
  messages: AssistantMessage[]
  currentMessage: AssistantMessage | null
  status: "idle" | "streaming" | "error"
  error?: string
}

export function createEmptyState(): StreamState {
  return { messages: [], currentMessage: null, status: "idle" }
}

let messageCounter = 0

function newMessageID(): string {
  return `msg_${Date.now()}_${messageCounter++}`
}

function currentOrNew(msg: AssistantMessage | null): AssistantMessage {
  if (msg) return msg
  return {
    id: newMessageID(),
    role: "assistant",
    content: "",
    reasoning: "",
    toolCalls: [],
    createdAt: Date.now(),
  }
}

function generateSummaryFromContent(content: string): string {
  if (!content) return "Processing your request..."
  const cleaned = content.replace(/[#*_`~]/g, '').trim()
  const firstSentence = cleaned.split(/[.!?\n]/)[0]?.trim()
  if (firstSentence && firstSentence.length > 10 && firstSentence.length <= 100) {
    return firstSentence
  }
  if (firstSentence && firstSentence.length > 100) {
    return firstSentence.slice(0, 97) + "..."
  }
  if (cleaned.length > 0) {
    return cleaned.length > 100 ? cleaned.slice(0, 97) + "..." : cleaned
  }
  return "Processing your request..."
}

function generateSummaryFromToolCalls(toolCalls: ToolCallState[]): string {
  if (toolCalls.length === 0) return ""
  const last = toolCalls[toolCalls.length - 1]
  if (last.name === "web_search") {
    const query = (last.input as any)?.query
    return query ? `Searching for "${query}"` : "Searching the web..."
  }
  if (last.name === "write_artifact") {
    const title = (last.input as any)?.title
    return title ? `Writing "${title}"` : "Writing content..."
  }
  return `Running ${last.name}...`
}

function buildActionSummary(
  content: string,
  toolCalls: ToolCallState[],
  isStreaming: boolean
): ActionSummary | undefined {
  if (!isStreaming && toolCalls.length === 0 && !content) return undefined

  const actions: ActionItem[] = toolCalls.map((tc, i) => ({
    id: tc.id || `action_${i}`,
    type: tc.name === "web_search" ? "search" : "tool_call",
    label: tc.name,
    description: formatToolDescription(tc),
    status: tc.status === "complete" ? "complete" : tc.status === "error" ? "error" : "active",
    input: tc.input,
    result: tc.result,
    error: tc.error,
  }))

  let summary: string
  if (content) {
    summary = generateSummaryFromContent(content)
  } else if (toolCalls.length > 0) {
    summary = generateSummaryFromToolCalls(toolCalls)
  } else {
    summary = "Processing your request..."
  }

  return { summary, actions }
}

function formatToolDescription(tc: ToolCallState): string {
  const input = tc.input as any
  if (!input) return ""
  if (tc.name === "web_search") {
    return input.query || ""
  }
  if (tc.name === "write_artifact") {
    return input.title || input.identifier || ""
  }
  return ""
}

export function reduceEvent(state: StreamState, event: LLMEvent): StreamState {
  switch (event.type) {
    case "step-start": {
      const msg = currentOrNew(state.currentMessage)
      const actionSummary = buildActionSummary(msg.content, msg.toolCalls, true)
      return { ...state, status: "streaming", currentMessage: { ...msg, actionSummary } }
    }

    case "text-start": {
      const msg = currentOrNew(state.currentMessage)
      const actionSummary = buildActionSummary(msg.content, msg.toolCalls, true)
      return { ...state, currentMessage: { ...msg, actionSummary } }
    }

    case "text-delta": {
      const msg = currentOrNew(state.currentMessage)
      const newContent = msg.content + event.text
      return {
        ...state,
        currentMessage: {
          ...msg,
          content: newContent,
        },
      }
    }

    case "text-end": {
      return state
    }

    case "reasoning-delta": {
      const msg = currentOrNew(state.currentMessage)
      return {
        ...state,
        currentMessage: {
          ...msg,
          reasoning: msg.reasoning + event.text,
        },
      }
    }

    case "tool-input-start": {
      const msg = currentOrNew(state.currentMessage)
      return {
        ...state,
        currentMessage: {
          ...msg,
          toolCalls: [
            ...msg.toolCalls,
            { id: event.id, name: event.name, input: null, status: "streaming" as const },
          ],
        },
      }
    }

    case "tool-input-delta":
      return state

    case "tool-input-end":
      return state

    case "tool-call": {
      const msg = currentOrNew(state.currentMessage)
      const toolCalls = msg.toolCalls.map((tc) =>
        tc.id === event.id ? { ...tc, input: event.input, status: "streaming" as const } : tc,
      )
      const hasTool = toolCalls.some((tc) => tc.id === event.id)
      const newToolCalls = hasTool
        ? toolCalls
        : [...toolCalls, { id: event.id, name: event.name, input: event.input, status: "streaming" as const }]
      const actionSummary = buildActionSummary(msg.content, newToolCalls, true)
      return {
        ...state,
        currentMessage: {
          ...msg,
          toolCalls: newToolCalls,
          actionSummary,
        },
      }
    }

    case "tool-result": {
      const msg = currentOrNew(state.currentMessage)
      const updatedToolCalls = msg.toolCalls.map((tc) =>
        tc.id === event.id ? { ...tc, result: event.result, status: "complete" as const } : tc,
      )
      const actionSummary = buildActionSummary(msg.content, updatedToolCalls, state.status === "streaming")
      return {
        ...state,
        currentMessage: {
          ...msg,
          toolCalls: updatedToolCalls,
          actionSummary,
        },
      }
    }

    case "tool-error": {
      const msg = currentOrNew(state.currentMessage)
      const updatedToolCalls = msg.toolCalls.map((tc) =>
        tc.id === event.id ? { ...tc, error: event.message, status: "error" as const } : tc,
      )
      const actionSummary = buildActionSummary(msg.content, updatedToolCalls, state.status === "streaming")
      return {
        ...state,
        currentMessage: {
          ...msg,
          toolCalls: updatedToolCalls,
          actionSummary,
        },
      }
    }

    case "step-finish": {
      const msg = state.currentMessage
      if (!msg) return state
      const actionSummary = buildActionSummary(msg.content, msg.toolCalls, false)
      return { ...state, currentMessage: { ...msg, actionSummary } }
    }

    case "finish": {
      if (!state.currentMessage) return { ...state, status: "idle" }
      const msg = { ...state.currentMessage, finishReason: event.reason }
      return {
        messages: [...state.messages, msg],
        currentMessage: null,
        status: "idle",
      }
    }

    case "provider-error": {
      if (state.currentMessage) {
        const msg = { ...state.currentMessage, finishReason: "error" as const }
        return {
          messages: [...state.messages, msg],
          currentMessage: null,
          status: "error",
          error: event.message,
        }
      }
      return {
        ...state,
        status: "error",
        error: event.message,
      }
    }

    default:
      return state
  }
}
