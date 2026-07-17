import { Effect, Stream } from "effect"
import type { LLMAdapter } from "../schema/adapter"
import type { LLMEvent } from "../schema/event-schemas"
import { LLMError } from "../schema"
import type { LLMRequest } from "../schema/messages"

export interface RetryConfig {
  readonly maxRetries: number
  readonly baseDelayMs?: number
  readonly maxDelayMs?: number
}

function calculateBackoff(retryNumber: number, config: RetryConfig): number {
  const base = config.baseDelayMs ?? 1000
  const max = config.maxDelayMs ?? 10000
  const exponential = Math.min(base * Math.pow(2, retryNumber - 1), max)
  const jitter = exponential * (0.75 + Math.random() * 0.5)
  return Math.floor(jitter)
}

function retryableStream(
  adapter: LLMAdapter,
  request: LLMRequest,
  signal: AbortSignal | undefined,
  config: RetryConfig,
  attempt: number,
): Stream.Stream<LLMEvent, LLMError> {
  let firstEventSeen = false

  return adapter.stream(request, signal).pipe(
    Stream.map((event) => {
      firstEventSeen = true
      return event
    }),
    Stream.catchAll((error: LLMError) => {
      if (signal?.aborted) return Stream.fail(error)
      if (firstEventSeen) return Stream.fail(error)
      if (!error.retryable) return Stream.fail(error)
      if (attempt >= config.maxRetries) return Stream.fail(error)

      const delay = error.retryAfterMs ?? calculateBackoff(attempt + 1, config)
      return Stream.fromEffect(Effect.sleep(delay)).pipe(
        Stream.flatMap(() =>
          retryableStream(adapter, request, signal, config, attempt + 1),
        ),
      )
    }),
  )
}

export function withRetry(adapter: LLMAdapter, config: RetryConfig): LLMAdapter {
  return {
    stream: (request: LLMRequest, signal?: AbortSignal) =>
      retryableStream(adapter, request, signal, config, 0),
  }
}
