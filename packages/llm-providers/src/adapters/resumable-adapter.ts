import { Effect, Stream } from "effect"
import type { LLMAdapter } from "../schema/adapter"
import type { LLMEvent } from "../schema/event-schemas"
import type { LLMRequest } from "../schema/messages"

export interface StreamEventStore {
  readonly append: (streamID: string, events: LLMEvent[]) => Effect.Effect<void>
  readonly get: (streamID: string) => Effect.Effect<readonly LLMEvent[]>
}

export function createInMemoryStreamStore(): StreamEventStore {
  const cache = new Map<string, LLMEvent[]>()
  return {
    append: (id, events) =>
      Effect.sync(() => {
        const existing = cache.get(id) ?? []
        existing.push(...events)
        cache.set(id, existing)
      }),
    get: (id) => Effect.sync(() => cache.get(id) ?? []),
  }
}

export function createResumableAdapter(
  adapter: LLMAdapter,
  store?: StreamEventStore,
): LLMAdapter {
  const eventStore = store ?? createInMemoryStreamStore()

  return {
    stream: (request: LLMRequest, signal?: AbortSignal) => {
      const streamID = request.id
      if (!streamID) {
        return adapter.stream(request, signal)
      }

      return Stream.unwrap(
        Effect.gen(function* () {
          const cached = yield* eventStore.get(streamID)

          const isComplete = cached.some(
            (e) => e.type === "finish" || e.type === "provider-error",
          )
          if (isComplete) {
            return Stream.fromIterable([...cached] as LLMEvent[])
          }

          const prefix =
            cached.length > 0
              ? Stream.fromIterable([...cached] as LLMEvent[])
              : Stream.empty

          const live = adapter.stream(request, signal).pipe(
            Stream.tap((event) =>
              Effect.ignoreLogged(eventStore.append(streamID, [event])),
            ),
          )

          if (cached.length === 0) return live
          return Stream.concat(prefix, live)
        }),
      )
    },
  }
}
