import { Effect, Stream } from "effect"
import { OpenAIProtocol } from "../protocols/openai-chat"
import type { OpenAIChatState, OpenAIStreamEvent } from "../protocols/openai-types"
import { createSSEParser, type SSEMessage } from "../route/sse-parser"
import type { LLMAdapter } from "../schema/adapter"
import type { LLMEvent } from "../schema/event-schemas"
import { LLMError } from "../schema"
import type { LLMRequest } from "../schema/messages"

export interface OpenAIAdapterConfig {
  readonly apiKey: string
  readonly baseURL?: string
}

const step = OpenAIProtocol.stream.step
const initial = OpenAIProtocol.stream.initial

function toLLMError(module: string, method: string, err: unknown): LLMError {
  return new LLMError({
    module,
    method,
    reason: { _tag: "Transport", message: err instanceof Error ? err.message : String(err) },
  } as any)
}

function processBatch(
  state: OpenAIChatState,
  msgs: ReadonlyArray<SSEMessage>,
): Effect.Effect<{ state: OpenAIChatState; events: ReadonlyArray<LLMEvent> }, LLMError> {
  return Effect.gen(function* () {
    let s = state
    const events: Array<LLMEvent> = []

    for (const msg of msgs) {
      if (msg.data === "[DONE]") continue

      let event: OpenAIStreamEvent
      try {
        event = JSON.parse(msg.data) as OpenAIStreamEvent
      } catch {
        continue
      }

      const [newState, evts] = yield* step(s, event)
      s = newState
      events.push(...evts)
    }

    return { state: s, events }
  })
}

export function createOpenAIAdapter(config: OpenAIAdapterConfig): LLMAdapter {
  const baseURL = config.baseURL ?? "https://api.openai.com/v1"

  return {
    stream: (request: LLMRequest, signal?: AbortSignal) =>
      Stream.unwrap(
        Effect.gen(function* () {
          const body = yield* OpenAIProtocol.body.from(request)

          const url = `${baseURL}/chat/completions`
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          }

          const response: Response = yield* Effect.tryPromise({
            try: () =>
              fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                signal,
              }),
            catch: (err) => toLLMError("OpenAIAdapter", "stream", err),
          })

          if (!response.ok) {
            const text = yield* Effect.promise(() => response.text())
            return Stream.fail(
              toLLMError(
                "OpenAIAdapter",
                "stream",
                new Error(`HTTP ${response.status}: ${text}`),
              ) as LLMError,
            )
          }

          const parser = createSSEParser()
          let state: OpenAIChatState = initial(request)

          const byteStream: Stream.Stream<Uint8Array, LLMError> = Stream.fromReadableStream({
            evaluate: () => response.body as ReadableStream<Uint8Array>,
            onError: (err) => toLLMError("OpenAIAdapter", "byteStream", err) as LLMError,
          })

          const eventStream = Stream.concat(
            byteStream.pipe(
              Stream.map((chunk) => parser.push(chunk)),
              Stream.filter((msgs) => msgs.length > 0),
              Stream.mapEffect((msgs) =>
                processBatch(state, msgs).pipe(
                  Effect.map((result) => {
                    state = result.state
                    return result.events
                  }),
                ),
              ),
              Stream.flatMap((events) => Stream.fromIterable(events)),
            ),
            Stream.suspend(() => {
              const msgs = parser.flush()
              if (msgs.length === 0) return Stream.empty
              return Stream.fromEffect(
                processBatch(state, msgs).pipe(
                  Effect.map((result) => result.events),
                ),
              ).pipe(
                Stream.flatMap((events) => Stream.fromIterable(events)),
              )
            }),
          )

          return eventStream
        }),
      ),
  }
}
