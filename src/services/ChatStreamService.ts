import { Stream, Effect } from "effect"
import type { LLMEvent, LLMError } from "@doktor/llm-providers"
import { nativeChatCompletion } from "@core/models/nativeChatCompletion"
import { getModelCapability } from "@core/reasoning/capabilities"
import { createInlineScanner, flushInlineScanner } from "@core/reasoning/inline-scanner"
import { DatabaseService } from "@core/utils/DatabaseService"
import { ChatSessionManager } from "./ChatSessionManager"
import { reduceEvent, createEmptyState } from "@/lib/llmEventReducer"
import type { UIMessage } from "@/lib/chatUtils"
import type { ProjectContext } from "@core/memory/contextController"

const USE_NATIVE = import.meta.env.VITE_FEATURE_NATIVE_LLM !== 'false'

interface StreamConfig {
  sessionId: string
  messages: UIMessage[]
  modelName: string
  modeId?: string
  projectContext?: ProjectContext
  connectedConnectors?: string[]
  isWebSearchEnabled?: boolean
  isThinkingEnabled?: boolean
}

interface StreamCallbacks {
  onMessage?: (message: UIMessage, isPartial: boolean) => void
  onFinish?: (message: UIMessage) => void
  onError?: (error: Error) => void
}

interface StreamState {
  config: StreamConfig
  controller: AbortController
  status: 'idle' | 'streaming' | 'error'
  error?: string
  subscribers: Set<(message: UIMessage, isPartial: boolean) => void>
  callbacks: StreamCallbacks
  llmState: ReturnType<typeof createEmptyState>
}

const activeStreams = new Map<string, StreamState>()
let streamIdCounter = 0

function toUIMessage(msg: { id: string; role: "assistant"; content: string; reasoning: string; createdAt: number; toolCalls?: { id: string; name: string; input: unknown; result?: unknown; error?: string; status: string }[] }): UIMessage {
  let content = msg.content || "";
  let reasoning = msg.reasoning || "";

  // Extract inline reasoning tags (even unclosed ones during streaming)
  const extractedReasoning: string[] = [];
  
  content = content.replace(/<(?:think|thought|reasoning)>([\s\S]*?)(?:<\/(?:think|thought|reasoning)>|$)/gi, (_, innerText) => {
    extractedReasoning.push(innerText);
    return '';
  });

  content = content.replace(/```(?:think|thinking|reasoning)\s*\n([\s\S]*?)(?:```|$)/gi, (_, innerText) => {
    extractedReasoning.push(innerText);
    return '';
  });

  content = content.replace(/\[(?:think|thought|reasoning)\]([\s\S]*?)(?:\[\/(?:think|thought|reasoning)\]|$)/gi, (_, innerText) => {
    extractedReasoning.push(innerText);
    return '';
  });

  if (extractedReasoning.length > 0) {
    reasoning = (reasoning ? reasoning + '\n\n' : '') + extractedReasoning.join('\n\n');
  }

  const toolInvocations = msg.toolCalls?.map((tc) => ({
    state: tc.status === "complete" ? "result" as const : tc.status === "error" ? "error" as const : "call" as const,
    toolCallId: tc.id,
    toolName: tc.name,
    args: tc.input,
    result: tc.result,
  })) ?? undefined

  return {
    id: msg.id,
    role: "assistant",
    content: content,
    reasoning: reasoning || null,
    toolInvocations,
    parts: [
      ...(reasoning ? [{ type: "reasoning" as const, text: reasoning }] : []),
      ...(toolInvocations ? toolInvocations.map((ti) => ({ type: "tool-invocation" as const, ...ti })) : []),
      { type: "text" as const, text: content },
    ],
    createdAt: msg.createdAt,
  }
}

async function persistMessage(sessionId: string, message: UIMessage, isPartial: boolean) {
  try {
    await DatabaseService.saveMessages(sessionId, [{ ...message }])
    if (!isPartial) {
      const session = await ChatSessionManager.getSession(sessionId)
      if (session && session.id !== getActiveSessionId()) {
        await ChatSessionManager.markAsUnread(sessionId)
        window.dispatchEvent(new CustomEvent('unread-changed'))
        window.dispatchEvent(new CustomEvent('background-stream-completed', {
          detail: { sessionId, title: session.title },
        }))
      }
    }
  } catch (e) {
    console.error('Failed to persist message:', e)
  }
}

let activeSessionId: string | null = null
export function setActiveSessionId(id: string | null) { activeSessionId = id }
function getActiveSessionId() { return activeSessionId }

async function runNativeStream(config: StreamConfig, callbacks: StreamCallbacks, controller: AbortController, attempt = 0) {
  const streamId = ++streamIdCounter
  const MAX_RETRIES = 1

  const cap = getModelCapability(config.modelName)
  const tags = cap.reasoning === 'tagged' && cap.mechanism.type === 'inline_tags'
    ? [{ open: cap.mechanism.open, close: cap.mechanism.close }]
    : null
  const scanner = tags ? createInlineScanner() : null
  let thinkingActive = false

  function flushTaggedReasoning(): { events: LLMEvent[]; reasoning: string } {
    if (!scanner || !tags) return { events: [], reasoning: "" }
    const flushed = flushInlineScanner(scanner)
    thinkingActive = false
    return { events: flushed.events, reasoning: flushed.reasoning }
  }
  
  try {
    const eventStreamPromise = nativeChatCompletion({
      messages: config.messages,
      modelName: config.modelName,
      modeId: config.modeId,
      projectId: config.sessionId,
      projectContext: config.projectContext,
      connectedConnectors: config.connectedConnectors,
      abortSignal: controller.signal,
    })

    const eventStream = await eventStreamPromise as unknown as Stream.Stream<LLMEvent, LLMError>

    await Effect.runPromise(
      Stream.runForEach(eventStream, (event) =>
        Effect.sync(() => {
          if (streamId !== streamIdCounter) return
          const state = activeStreams.get(config.sessionId)
          if (!state) return

          const skipReason = !state.config.isThinkingEnabled
          const events: LLMEvent[] = [event]

          if (tags && scanner && event.type === "text-delta" && !skipReason) {
            const { content, reasoning, events: tagEvents } = scanner.feed(event.text, tags)
            events.length = 0
            if (!thinkingActive && tagEvents.some(e => e.type === "reasoning-start")) {
              thinkingActive = true
            }
            if (reasoning && !thinkingActive) {
              events.push({ type: "reasoning-start", id: "tagged" } as LLMEvent)
              thinkingActive = true
            }
            events.push(...tagEvents)
            if (content) {
              events.push({ ...event, text: content } as LLMEvent)
            }
          }

          // Flush any pending tagged reasoning before finish
          if ((event.type === "finish" || event.type === "provider-error") && thinkingActive) {
            const tail = flushTaggedReasoning()
            for (const ev of tail.events) {
              const next = reduceEvent(state.llmState, ev, { skipReasoning: skipReason })
              state.llmState = next
            }
          }

          for (const ev of events) {
            const next = reduceEvent(state.llmState, ev, { skipReasoning: skipReason })
            state.llmState = next
          }
          
          if (state.llmState.currentMessage && (state.llmState.currentMessage.content || state.llmState.currentMessage.reasoning)) {
            const uiMsg = toUIMessage(state.llmState.currentMessage)
            persistMessage(config.sessionId, uiMsg, true)
            callbacks.onMessage?.(uiMsg, true)
            state.subscribers.forEach(cb => cb(uiMsg, true))
          }
          
          if (state.llmState.status === "idle" && !state.llmState.currentMessage && state.llmState.messages.length > 0) {
            const last = state.llmState.messages[state.llmState.messages.length - 1]
            const uiMsg = toUIMessage(last)
            persistMessage(config.sessionId, uiMsg, false)
            callbacks.onFinish?.(uiMsg)
            callbacks.onMessage?.(uiMsg, false)
            state.subscribers.forEach(cb => cb(uiMsg, false))
            state.status = 'idle'
          }
        })
      ),
    )
  } catch (err: any) {
    if (err?.name === "AbortError") return
    
    // Auto-retry once on failure
    if (attempt < MAX_RETRIES) {
      const state = activeStreams.get(config.sessionId)
      if (state && state.status === 'streaming') {
        console.warn(`Stream failed, retrying (attempt ${attempt + 1})...`)
        state.llmState = createEmptyState()
        return runNativeStream(config, callbacks, controller, attempt + 1)
      }
    }
    
    const error = err instanceof Error ? err : new Error(String(err))
    const state = activeStreams.get(config.sessionId)
    if (state) {
      state.status = 'error'
      state.error = String(err)
    }
    callbacks.onError?.(error)
  }
}

function runAISDKStream(config: StreamConfig, callbacks: StreamCallbacks, controller: AbortController) {
  runNativeStream(config, callbacks, controller)
}

export const ChatStreamService = {
  async start(config: StreamConfig, callbacks: StreamCallbacks = {}) {
    const existing = activeStreams.get(config.sessionId)
    if (existing && existing.status === 'streaming') {
      existing.callbacks = callbacks
      return
    }

    const controller = new AbortController()
    const state: StreamState = {
      config,
      controller,
      status: 'streaming',
      subscribers: new Set(),
      callbacks,
      llmState: createEmptyState(),
    }
    activeStreams.set(config.sessionId, state)

    try {
      await ChatSessionManager.setStreaming(config.sessionId, true)
    } catch (e) {
      console.error('Failed to set streaming flag:', e)
    }

    const runStream = USE_NATIVE ? runNativeStream : runAISDKStream
    runStream(config, {
      onMessage: (msg, partial) => callbacks.onMessage?.(msg, partial),
      onFinish: (msg) => {
        callbacks.onFinish?.(msg)
        this._clearStreaming(config.sessionId)
      },
      onError: (err) => {
        callbacks.onError?.(err)
        this._clearStreaming(config.sessionId)
      },
    }, controller)
  },

  async _clearStreaming(sessionId: string) {
    try {
      await ChatSessionManager.setStreaming(sessionId, false)
    } catch (e) {
      console.error('Failed to clear streaming flag:', e)
    }
  },

  async stop(sessionId: string) {
    const state = activeStreams.get(sessionId)
    if (state) {
      state.controller.abort()
      state.status = 'idle'
      state.subscribers.clear()
      activeStreams.delete(sessionId)
      try {
        await ChatSessionManager.setStreaming(sessionId, false)
      } catch (e) {
        console.error('Failed to clear streaming flag:', e)
      }
    }
  },

  subscribe(sessionId: string, callback: (message: UIMessage, isPartial: boolean) => void) {
    const state = activeStreams.get(sessionId)
    if (state) {
      state.subscribers.add(callback)
      if (state.llmState?.currentMessage?.content) {
        const uiMsg = toUIMessage(state.llmState.currentMessage)
        callback(uiMsg, true)
      }
      return () => state.subscribers.delete(callback)
    }
    return () => {}
  },

  unsubscribe(sessionId: string, callback: (message: UIMessage, isPartial: boolean) => void) {
    const state = activeStreams.get(sessionId)
    if (state) {
      state.subscribers.delete(callback)
    }
  },

  getStatus(sessionId: string): 'idle' | 'streaming' | 'error' | undefined {
    return activeStreams.get(sessionId)?.status
  },

  getError(sessionId: string): string | undefined {
    return activeStreams.get(sessionId)?.error
  },

  isStreaming(sessionId: string): boolean {
    const state = activeStreams.get(sessionId)
    return state?.status === 'streaming'
  },

  getAllStreamingSessions(): string[] {
    return Array.from(activeStreams.entries())
      .filter(([, s]) => s.status === 'streaming')
      .map(([id]) => id)
  },
}

declare global {
  interface Window {
    ChatStreamService: typeof ChatStreamService
  }
}
if (typeof window !== 'undefined') {
  window.ChatStreamService = ChatStreamService
}