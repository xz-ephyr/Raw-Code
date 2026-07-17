import { Effect, Stream } from "effect"
import { AnthropicProtocol } from "../protocols/anthropic-messages"
import type { AnthropicState, AnthropicStreamEvent } from "../protocols/anthropic-messages"
import { createSSEParser, type SSEMessage } from "../route/sse-parser"
import type { LLMAdapter } from "../schema/adapter"
import type { LLMEvent } from "../schema/event-schemas"
import { LLMError } from "../schema"
import type { LLMRequest } from "../schema/messages"

export interface AnthropicAdapterConfig {
  readonly apiKey: string
  readonly baseURL?: string
}

const step = AnthropicProtocol.stream.step
const initial = AnthropicProtocol.stream.initial

function toLLMError(module: string, method: string, err: unknown): LLMError {
  return new LLMError({
    module,
    method,
    reason: { _tag: "Transport", message: err instanceof Error ? err.message : String(err) },
  } as any)
}

function processBatch(
  state: AnthropicState,
  msgs: ReadonlyArray<SSEMessage>,
): Effect.Effect<{ state: AnthropicState; events: ReadonlyArray<LLMEvent> }, LLMError> {
  return Effect.gen(function* () {
    let s = state
    const events: Array<LLMEvent> = []

    for (const msg of msgs) {
      if (msg.data === "[DONE]") continue

      let event: AnthropicStreamEvent
      try {
        event = JSON.parse(msg.data) as AnthropicStreamEvent
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

export function createAnthropicAdapter(config: AnthropicAdapterConfig): LLMAdapter {
  const baseURL = config.baseURL ?? "https://api.anthropic.com/v1"

  return {
    stream: (request: LLMRequest, signal?: AbortSignal) =>
      Stream.unwrap(
        Effect.gen(function* () {
          const body = yield* AnthropicProtocol.body.from(request)

          const url = `${baseURL}/messages`
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
            "anthropic-version": "2023-06-01",
          }

          const response: Response = yield* Effect.tryPromise({
            try: () =>
              fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                signal,
              }),
            catch: (err) => toLLMError("AnthropicAdapter", "stream", err),
          })

          if (!response.ok) {
            const text = yield* Effect.promise(() => response.text())
            return Stream.fail(
              toLLMError(
                "AnthropicAdapter",
                "stream",
                new Error(`HTTP ${response.status}: ${text}`),
              ) as LLMError,
            )
          }

          const parser = createSSEParser()
          let state: AnthropicState = initial(request)

          const byteStream: Stream.Stream<Uint8Array, LLMError> = Stream.fromReadableStream({
            evaluate: () => response.body as ReadableStream<Uint8Array>,
            onError: (err) => toLLMError("AnthropicAdapter", "byteStream", err) as LLMError,
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
