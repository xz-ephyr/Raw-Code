import type { LLMEvent } from "@doktor/llm-providers"

export interface AssistantMessage {
  id: string
  role: "assistant"
  content: string
  reasoning: string
  toolCalls: ToolCallState[]
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

function stripThinkingTags(text: string): string {
  return text
    .replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/g, '')
    .replace(/<(?:think|thought)>[\s\S]*$/g, '')
}

export function reduceEvent(state: StreamState, event: LLMEvent, options?: { skipReasoning?: boolean }): StreamState {
  const skipReasoning = options?.skipReasoning ?? false
  switch (event.type) {
    case "step-start": {
      return { ...state, status: "streaming" }
    }

    case "text-start": {
      return { ...state, currentMessage: currentOrNew(state.currentMessage) }
    }

    case "text-delta": {
      const msg = currentOrNew(state.currentMessage)
      return {
        ...state,
        currentMessage: {
          ...msg,
          content: msg.content + event.text,
        },
      }
    }

    case "text-end": {
      return state
    }

    case "reasoning-delta": {
      if (skipReasoning) return state
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
      return {
        ...state,
        currentMessage: {
          ...msg,
          toolCalls: hasTool
            ? toolCalls
            : [...toolCalls, { id: event.id, name: event.name, input: event.input, status: "streaming" as const }],
        },
      }
    }

    case "tool-result": {
      const msg = currentOrNew(state.currentMessage)
      return {
        ...state,
        currentMessage: {
          ...msg,
          toolCalls: msg.toolCalls.map((tc) =>
            tc.id === event.id ? { ...tc, result: event.result, status: "complete" as const } : tc,
          ),
        },
      }
    }

    case "tool-error": {
      const msg = currentOrNew(state.currentMessage)
      return {
        ...state,
        currentMessage: {
          ...msg,
          toolCalls: msg.toolCalls.map((tc) =>
            tc.id === event.id ? { ...tc, error: event.message, status: "error" as const } : tc,
          ),
        },
      }
    }

    case "step-finish": {
      return state
    }

    case "finish": {
      if (!state.currentMessage) return { ...state, status: "idle" }
      const msg = { ...state.currentMessage, finishReason: event.reason }
      if (skipReasoning) {
        msg.content = stripThinkingTags(msg.content)
        msg.reasoning = ''
      }
      return {
        messages: [...state.messages, msg],
        currentMessage: null,
        status: "idle",
      }
    }

    case "provider-error": {
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
