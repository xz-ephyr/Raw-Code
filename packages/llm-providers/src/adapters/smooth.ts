import { Effect, Stream, Option } from "effect"
import type { LLMEvent } from "../schema/event-schemas"
import { LLMError } from "../schema"

export interface SmoothConfig {
  readonly tickMs: number
  readonly minCharsPerTick: number
  readonly maxCharsPerTick: number
  readonly forceCharsPerTick: number
  readonly forceTickMs: number
}

export const defaultSmoothConfig: SmoothConfig = {
  tickMs: 33,
  minCharsPerTick: 1,
  maxCharsPerTick: 20,
  forceCharsPerTick: 50,
  forceTickMs: 8,
}

function adaptiveRate(
  backlog: number,
  pendingFinish: boolean,
  config: SmoothConfig,
): number {
  if (pendingFinish) return config.forceCharsPerTick
  if (backlog < 5) return config.minCharsPerTick
  if (backlog < 20) return 3
  if (backlog < 100) return 8
  if (backlog < 500) return 15
  return Math.min(config.maxCharsPerTick, Math.floor(backlog / 10))
}

export function smoothStream(
  stream: Stream.Stream<LLMEvent, LLMError>,
  config?: Partial<SmoothConfig>,
): Stream.Stream<LLMEvent, LLMError> {
  const cfg = { ...defaultSmoothConfig, ...config }

  let buffer = ""
  let pendingFinish: LLMEvent | null = null
  let finished = false
  let lastId = 0

  function nextId(): string {
    return `smooth-${++lastId}`
  }

  const passthrough = stream.pipe(
    Stream.mapEffect((event: LLMEvent) =>
      Effect.sync((): LLMEvent | null => {
        if (event.type === "text-delta") {
          buffer += event.text
          return null
        }
        if (event.type === "finish" || event.type === "provider-error") {
          pendingFinish = event
          return null
        }
        return event
      }),
    ),
    Stream.filter((e: LLMEvent | null): e is LLMEvent => e !== null),
  )

  const ticker = Stream.unfoldEffect(0, () =>
    Effect.gen(function* () {
      if (finished) return Option.none()

      const sleepMs = pendingFinish ? cfg.forceTickMs : cfg.tickMs
      yield* Effect.sleep(sleepMs)

      if (buffer.length > 0) {
        const rate = adaptiveRate(buffer.length, pendingFinish !== null, cfg)
        const chunk = buffer.slice(0, rate)
        buffer = buffer.slice(rate)
        return Option.some([
          { type: "text-delta" as const, id: nextId(), text: chunk } as LLMEvent,
          0,
        ])
      }

      if (pendingFinish) {
        const evt = pendingFinish
        pendingFinish = null
        finished = true
        return Option.some([evt, 0])
      }

      return Option.some([null as unknown as LLMEvent, 0])
    }),
  ).pipe(
    Stream.filter((e: LLMEvent | null): e is LLMEvent => e !== null),
  )

  return Stream.merge(passthrough, ticker)
}
