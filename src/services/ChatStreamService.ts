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
import { getModelDefinition } from "@core/config/models"
import { recordUsage } from "@core/utils/usageTracker"

const USE_NATIVE = import.meta.env.VITE_FEATURE_NATIVE_LLM !== 'false'

interface StreamConfig {
  sessionId: string
  messages: UIMessage[]
  modelName: string
  modeId?: string
  projectContext?: ProjectContext
  connectedConnectors?: string[]
  isWebSearchEnabled?: boolean
}

interface StreamCallbacks {
  onMessage?: (message: UIMessage, isPartial: boolean) => void
  onFinish?: (message: UIMessage) => void
  onError?: (error: Error) => void
  onUsageUpdate?: (usage: { inputTokens: number; outputTokens: number; totalTokens: number; reasoningTokens?: number; cachedInputTokens?: number }) => void
}

interface StreamState {
  config: StreamConfig
  controller: AbortController
  status: 'idle' | 'streaming' | 'error'
  error?: string
  subscribers: Set<(message: UIMessage, isPartial: boolean) => void>
  callbacks: StreamCallbacks
  llmState: ReturnType<typeof createEmptyState>
  streamGeneration: number
}

const activeStreams = new Map<string, StreamState>()
const sessionGenerationCounters = new Map<string, number>()

function toUIMessage(msg: { id: string; role: "assistant"; content: string; reasoning: string; createdAt: number; toolCalls?: { id: string; name: string; input: unknown; result?: unknown; error?: string; status: string }[]; actionSummary?: { summary: string; actions: any[] } }): UIMessage {
  let content = msg.content || "";
  let reasoning = msg.reasoning || "";

  // Extract inline reasoning tags (even unclosed ones during streaming)
  const extractedReasoning: string[] = [];
  
  content = content.replace(/<(?:think|thought|reasoning)>([\s\S]*?)<\/(?:think|thought|reasoning)>/gi, (_, innerText) => {
    extractedReasoning.push(innerText);
    return '';
  });

  content = content.replace(/```(?:think|thinking|reasoning)\s*\n([\s\S]*?)```/gi, (_, innerText) => {
    extractedReasoning.push(innerText);
    return '';
  });

  content = content.replace(/\[(?:think|thought|reasoning)\]([\s\S]*?)\[\/(?:think|thought|reasoning)\]/gi, (_, innerText) => {
    extractedReasoning.push(innerText);
    return '';
  });

  if (extractedReasoning.length > 0) {
    reasoning = (reasoning ? reasoning + '\n\n' : '') + extractedReasoning.join('\n\n');
  }

  const toolInvocations = msg.toolCalls && msg.toolCalls.length > 0
    ? msg.toolCalls.map((tc) => ({
        state: tc.status === "complete" ? "result" as const : tc.status === "error" ? "error" as const : "call" as const,
        toolCallId: tc.id,
        toolName: tc.name,
        args: tc.input,
        result: tc.result,
      }))
    : undefined

  return {
    id: msg.id,
    role: "assistant",
    content: content,
    reasoning: reasoning || null,
    toolInvocations,
    actionSummary: msg.actionSummary || null,
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
        }
      }
  } catch (e) {
    console.error('Failed to persist message:', e)
  }
}

let activeSessionId: string | null = null
export function setActiveSessionId(id: string | null) { activeSessionId = id }
function getActiveSessionId() { return activeSessionId }

async function runNativeStream(config: StreamConfig, callbacks: StreamCallbacks, controller: AbortController, streamGeneration: number) {
  const cap = getModelCapability(config.modelName)
  const tags = cap.reasoning === 'tagged' && cap.mechanism.type === 'inline_tags'
    ? [{ open: cap.mechanism.open, close: cap.mechanism.close }]
    : null
  const scanner = tags ? createInlineScanner() : null
  let thinkingActive = false
  const streamStartTime = Date.now()
  let finalized = false

  function flushMessage(msg: UIMessage, isPartial: boolean) {
    if (finalized) return
    callbacks.onMessage?.(msg, isPartial)
    const st = activeStreams.get(config.sessionId)
    st?.subscribers.forEach(cb => cb(msg, isPartial))
  }

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
      Stream.runForEach(
        eventStream.pipe(Stream.timeout("60 seconds")),
        (event) =>
          Effect.sync(() => {
          const state = activeStreams.get(config.sessionId)
          if (!state || state.streamGeneration !== streamGeneration) return

          const events: LLMEvent[] = [event]

          if (tags && scanner && event.type === "text-delta") {
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
              const next = reduceEvent(state.llmState, ev)
              state.llmState = next
            }
          }

          for (const ev of events) {
            const next = reduceEvent(state.llmState, ev)
            state.llmState = next
          }

          if (event.type === "finish") {
            const provider = getModelDefinition(config.modelName)?.provider || "google"
            const inputTokens = (event as any).usage?.inputTokens ?? 0
            const outputTokens = (event as any).usage?.outputTokens ?? 0
            const totalTokens = (event as any).usage?.totalTokens ?? 0
            recordUsage({
              model: config.modelName,
              provider,
              promptTokens: inputTokens,
              completionTokens: outputTokens,
              totalTokens,
              success: true,
              latency: Date.now() - streamStartTime,
              timestamp: Date.now(),
            })
            callbacks.onUsageUpdate?.({
              inputTokens,
              outputTokens,
              totalTokens,
              reasoningTokens: (event as any).usage?.reasoningTokens,
              cachedInputTokens: (event as any).usage?.cachedInputTokens,
            })
          } else if (event.type === "provider-error") {
            const provider = getModelDefinition(config.modelName)?.provider || "google"
            recordUsage({
              model: config.modelName,
              provider,
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              success: false,
              latency: Date.now() - streamStartTime,
              timestamp: Date.now(),
            })
          }
          
          if (state.llmState.currentMessage && (state.llmState.currentMessage.content || state.llmState.currentMessage.reasoning || state.llmState.currentMessage.actionSummary)) {
            const uiMsg = toUIMessage(state.llmState.currentMessage)
            console.log('[chatStream] flush:', { contentLen: state.llmState.currentMessage.content.length, reasoningLen: state.llmState.currentMessage.reasoning.length, hasActionSummary: !!state.llmState.currentMessage.actionSummary })
            persistMessage(config.sessionId, uiMsg, true)
            flushMessage(uiMsg, true)
          }
          
          if (state.status === 'streaming' && state.llmState.status === "idle" && !state.llmState.currentMessage) {
            finalized = true
            const last = state.llmState.messages[state.llmState.messages.length - 1]
            console.log('[chatStream] finish:', { contentLen: last?.content?.length, reasoningLen: last?.reasoning?.length, msgCount: state.llmState.messages.length, finalized })
            if (last) {
              const uiMsg = toUIMessage(last)
              persistMessage(config.sessionId, uiMsg, false)
              callbacks.onFinish?.(uiMsg)
              callbacks.onMessage?.(uiMsg, false)
              state.subscribers.forEach(cb => cb(uiMsg, false))
            }
            state.status = 'idle'
          }
          if (state.status === 'streaming' && state.llmState.status === "error" && state.llmState.error && !state.llmState.currentMessage) {
            finalized = true
            callbacks.onError?.(new Error(state.llmState.error))
            state.status = 'idle'
          }
        })
      ),
    )

    // Safety net: if stream ended without a finish event, force completion
    const st = activeStreams.get(config.sessionId)
    if (st && st.streamGeneration === streamGeneration && st.status === 'streaming') {
      finalized = true
      const last = st.llmState.messages[st.llmState.messages.length - 1]
      if (last) {
        const uiMsg = toUIMessage(last)
        persistMessage(config.sessionId, uiMsg, false)
        callbacks.onFinish?.(uiMsg)
        callbacks.onMessage?.(uiMsg, false)
        st.subscribers.forEach(cb => cb(uiMsg, false))
      }
      st.status = 'idle'
    }
  } catch (err: any) {
    finalized = true
    if (err?.name === "AbortError") return

    const state = activeStreams.get(config.sessionId)
    if (!state || state.streamGeneration !== streamGeneration || state.status !== 'streaming') return

    const provider = getModelDefinition(config.modelName)?.provider || "google"
    recordUsage({
      model: config.modelName,
      provider,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      success: false,
      latency: Date.now() - streamStartTime,
      timestamp: Date.now(),
    })

    callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
  }
}



function runAISDKStream(config: StreamConfig, callbacks: StreamCallbacks, controller: AbortController, streamGeneration: number) {
  return runNativeStream(config, callbacks, controller, streamGeneration)
}

export const ChatStreamService = {
  async start(config: StreamConfig, callbacks: StreamCallbacks = {}) {
    const existing = activeStreams.get(config.sessionId)
    if (existing && existing.status === 'streaming') {
      await this.stop(config.sessionId)
    }

    const generation = (sessionGenerationCounters.get(config.sessionId) ?? 0) + 1
    sessionGenerationCounters.set(config.sessionId, generation)
    const controller = new AbortController()
    const state: StreamState = {
      config,
      controller,
      status: 'streaming',
      subscribers: new Set(),
      callbacks,
      llmState: createEmptyState(),
      streamGeneration: generation,
    }
    activeStreams.set(config.sessionId, state)

    try {
      await ChatSessionManager.setStreaming(config.sessionId, true)
    } catch (e) {
      console.error('Failed to set streaming flag:', e)
    }

    const runStream = USE_NATIVE ? runNativeStream : runAISDKStream
    try {
      await runStream(config, {
        onMessage: (msg, partial) => callbacks.onMessage?.(msg, partial),
        onFinish: (msg) => {
          callbacks.onFinish?.(msg)
          this._clearStreaming(config.sessionId)
        },
        onError: (err) => {
          callbacks.onError?.(err)
          this._clearStreaming(config.sessionId)
        },
        onUsageUpdate: (usage) => callbacks.onUsageUpdate?.(usage),
      }, controller, generation)
    } catch (err: any) {
      if (err?.name === "AbortError") return
      callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
      this._clearStreaming(config.sessionId)
    }
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
      window.dispatchEvent(new CustomEvent('stream-cancelled', { detail: { sessionId } }))
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
