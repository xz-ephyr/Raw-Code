import { Stream } from "effect"
import type { LLMError } from "../schema"
import { isRecord } from "../utils/record"
import { createSSEParser } from "./sse-parser"

export interface Framing<Frame> {
  readonly id: string
  readonly frame: (bytes: Stream.Stream<Uint8Array, LLMError>) => Stream.Stream<Frame, LLMError>
}

const toLLMError = (error: unknown): LLMError => {
  const message = isRecord(error) && typeof error.message === "string" ? error.message : String(error)
  return { _tag: "LLM.Error", module: "Framing", method: "frame", reason: { _tag: "Transport", message } } as any
}

export const sse: Framing<string> = {
  id: "sse",
  frame: (bytes) => {
    const parser = createSSEParser()
    return bytes.pipe(
      Stream.map((chunk) => parser.push(chunk)),
      Stream.flatMap((msgs) => {
        const data = msgs
          .filter((m) => m.data !== "[DONE]")
          .map((m) => m.data)
        return data.length > 0 ? Stream.fromIterable(data) : Stream.empty
      }),
      Stream.concat(
        Stream.suspend(() => {
          const remaining = parser.flush()
          const data = remaining
            .filter((m) => m.data !== "[DONE]")
            .map((m) => m.data)
          return data.length > 0 ? Stream.fromIterable(data) : Stream.empty
        }),
      ),
      Stream.catchAll((error) => Stream.fail(toLLMError(error))),
    )
  },
}

export * as Framing from "./framing"
