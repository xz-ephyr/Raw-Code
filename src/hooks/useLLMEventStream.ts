import { useState, useRef, useCallback, useEffect } from "react"
import { Stream, Effect } from "effect"
import { nativeChatCompletion } from "@core/models/nativeChatCompletion"
import { reduceEvent, createEmptyState } from "@/lib/llmEventReducer"
import type { UIMessage } from "@/lib/chatUtils"
import type { ProjectContext } from "@core/memory/contextController"

export interface UseLLMEventStreamOptions {
  id?: string
  modelName?: string
  modeId?: string
  projectId?: string
  projectContext?: ProjectContext
  connectedConnectors?: string[]
  onError?: (error: Error) => void
  onFinish?: (event: { message: UIMessage }) => void
}

export interface UseLLMEventStreamReturn {
  messages: UIMessage[]
  status: "idle" | "streaming" | "error"
  error: string | undefined
  sendMessage: (msg: { text: string }) => Promise<void>
  stop: () => void
  setMessages: (msgs: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void
}

function toUIMessage(msg: { id: string; role: "assistant"; content: string; reasoning: string; createdAt: number }): UIMessage {
  return {
    id: msg.id,
    role: "assistant",
    content: msg.content,
    reasoning: msg.reasoning || null,
    parts: [
      ...(msg.reasoning ? [{ type: "reasoning" as const, text: msg.reasoning }] : []),
      { type: "text" as const, text: msg.content },
    ],
    createdAt: msg.createdAt,
  }
}

const activeControllers = new Map<string, AbortController>()

export function useLLMEventStream(options?: UseLLMEventStreamOptions): UseLLMEventStreamReturn {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [streamState, setStreamState] = useState(createEmptyState())
  const streamRef = useRef<{ cancel: () => void } | null>(null)
  const id = options?.id ?? "default"
  const streamIdRef = useRef(0)

  useEffect(() => {
    return () => {
      streamRef.current?.cancel()
      activeControllers.delete(id)
    }
  }, [id])

  const sendMessage = useCallback(async (msg: { text: string }) => {
    const userMsg: UIMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: msg.text,
      createdAt: Date.now(),
      parts: [{ type: "text" as const, text: msg.text }],
    }

    setMessages((prev) => [...prev, userMsg])
    setStreamState(createEmptyState())

    const controller = new AbortController()
    activeControllers.set(id, controller)

    streamRef.current = {
      cancel: () => {
        controller.abort()
        activeControllers.delete(id)
      },
    }

    const streamId = ++streamIdRef.current

    try {
      const eventStream = await nativeChatCompletion({
        messages: [...messages, userMsg],
        modelName: options?.modelName ?? "auto",
        modeId: options?.modeId,
        projectId: options?.projectId,
        projectContext: options?.projectContext,
        connectedConnectors: options?.connectedConnectors,
        abortSignal: controller.signal,
      })

      await Effect.runPromise(
        Stream.runForEach(
          eventStream.pipe(Stream.timeout("60 seconds")),
          (event) =>
          Effect.sync(() => {
            if (streamId !== streamIdRef.current) return
            setStreamState((prev) => {
              const next = reduceEvent(prev, event)
              if (next.currentMessage && next.currentMessage.content) {
                const uiMsg = toUIMessage(next.currentMessage)
                setMessages((prevMsgs) => {
                  const exists = prevMsgs.findIndex((m) => m.id === uiMsg.id)
                  if (exists >= 0) {
                    const updated = [...prevMsgs]
                    updated[exists] = uiMsg
                    return updated
                  }
                  return [...prevMsgs, uiMsg]
                })
              }
              if (next.status === "idle" && !next.currentMessage && next.messages.length > 0) {
                const last = next.messages[next.messages.length - 1]
                const uiMsg = toUIMessage(last)
                setMessages((prevMsgs) => {
                  const exists = prevMsgs.findIndex((m) => m.id === uiMsg.id)
                  if (exists >= 0) {
                    const updated = [...prevMsgs]
                    updated[exists] = uiMsg
                    return updated
                  }
                  return [...prevMsgs, uiMsg]
                })
                options?.onFinish?.({ message: uiMsg })
              }
              return next
            })
          }),
        ),
      )
    } catch (err: any) {
      if (err?.name === "AbortError") return
      options?.onError?.(err instanceof Error ? err : new Error(String(err)))
      setStreamState((prev) => ({ ...prev, status: "error", error: String(err) }))
    }
  }, [messages, id, options])

  const stop = useCallback(() => {
    streamRef.current?.cancel()
  }, [])

  return {
    messages,
    status: streamState.status === "error" ? "error" : streamState.status,
    error: streamState.error,
    sendMessage,
    stop,
    setMessages,
  }
}
