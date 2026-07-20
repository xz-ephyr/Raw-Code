import { Effect, Stream, Option } from "effect"
import type { LLMEvent } from "../schema/event-schemas"
import { LLMError } from "../schema"

export interface SmoothConfig {
  readonly charsPerTick: number
  readonly tickMs: number
  readonly idleTimeoutMs: number
  readonly punctuationPauseMs: number
  readonly codeBlockMultiplier: number
  readonly wordBoundaryAware: boolean
}

export const defaultSmoothConfig: SmoothConfig = {
  charsPerTick: 8,
  tickMs: 16,
  idleTimeoutMs: 30_000,
  punctuationPauseMs: 120,
  codeBlockMultiplier: 1,
  wordBoundaryAware: true,
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
  let sourceEnded = false
  let idleSince = Date.now()
  let inCodeBlock = false
  let punctuationPauseUntil = 0

  function nextId(): string {
    return `smooth-${++lastId}`
  }

  function isPunctuation(char: string): boolean {
    return /[.!?,;:]/.test(char)
  }

  function isWordBoundary(buf: string, n: number): boolean {
    if (n >= buf.length) return true
    const char = buf[n]
    const prevChar = n > 0 ? buf[n - 1] : ' '
    return /\s/.test(char) || /\s/.test(prevChar) || isPunctuation(prevChar)
  }

  function getCharsPerTick(): number {
    const multiplier = inCodeBlock ? cfg.codeBlockMultiplier : 1
    return Math.max(1, Math.round(cfg.charsPerTick / multiplier))
  }

  function getTickDelay(): number {
    return inCodeBlock ? cfg.tickMs * cfg.codeBlockMultiplier : cfg.tickMs
  }

  // Internal sentinel for "ticker ticked but produced no output this cycle".
  // Kept out of the LLMEvent union so it can never reach a downstream consumer.
  const TICK_EMPTY = { type: "tick-empty" } as unknown as LLMEvent

  const transformed = stream.pipe(
    Stream.mapEffect((event: LLMEvent) =>
      Effect.sync((): LLMEvent | null => {
        if (event.type === "text-start" || event.type === "step-start") {
          // Reset code-fence tracking per content block so a stuck state from a
          // prior message/step cannot leak into the next one.
          inCodeBlock = false
        }
        if (event.type === "text-delta") {
          buffer += event.text
          idleSince = Date.now()
          const backticks = (event.text.match(/```/g) || []).length
          if (backticks % 2 === 1) inCodeBlock = !inCodeBlock
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

  const passthrough = Stream.concat(
    transformed,
    Stream.fromEffect(
      Effect.sync(() => { sourceEnded = true }),
    ).pipe(Stream.flatMap(() => Stream.empty)),
  )

  const ticker = Stream.unfoldEffect(0, () =>
    Effect.gen(function* () {
      if (finished) return Option.none()

      if (!pendingFinish && buffer.length === 0 && !sourceEnded && Date.now() - idleSince > cfg.idleTimeoutMs) {
        finished = true
        return Option.none()
      }

      const now = Date.now()
      if (now < punctuationPauseUntil) {
        yield* Effect.sleep(punctuationPauseUntil - now)
      }

      yield* Effect.sleep(getTickDelay())

      if (buffer.length > 0) {
        let n = getCharsPerTick()
        n = Math.min(n, buffer.length)

        if (cfg.wordBoundaryAware && n < buffer.length && !isWordBoundary(buffer, n)) {
          const nextSpace = buffer.indexOf(' ', n)
          if (nextSpace !== -1 && nextSpace <= n + 3) {
            n = nextSpace + 1
          }
        }

        const chunk = buffer.slice(0, n)
        buffer = buffer.slice(n)

        if (cfg.wordBoundaryAware && chunk.length > 0) {
          const lastChar = chunk[chunk.length - 1]
          if (isPunctuation(lastChar)) {
            punctuationPauseUntil = Date.now() + cfg.punctuationPauseMs
          }
        }

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

      if (sourceEnded) {
        finished = true
        return Option.some([{ type: "finish", reason: "unknown" } as LLMEvent, 0])
      }

      // No output to emit this cycle. Emit a sentinel (stripped below) and keep
      // the ticker alive until the source ends — an idle gap must NOT terminate
      // the ticker, or buffered text from a later burst would never flush.
      return Option.some([TICK_EMPTY, 0])
    }),
  ).pipe(
    Stream.filter((e: LLMEvent): boolean => (e as any).type !== "tick-empty"),
  )

  return Stream.merge(passthrough, ticker)
}
