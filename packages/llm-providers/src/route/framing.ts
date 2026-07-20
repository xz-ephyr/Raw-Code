import { Stream, Effect } from "effect"
import type { LLMError } from "../schema"
import { isRecord } from "../utils/record"
import { createSSEParser } from "./sse-parser"

export interface Framing<Frame> {
  readonly id: string
  readonly frame: (bytes: Stream.Stream<Uint8Array, LLMError>) => Stream.Stream<Frame, LLMError>
}

const toLLMError = (error: unknown): LLMError => {
  let message: string
  if (isRecord(error) && typeof error.message === "string") {
    message = error.message
  } else if (isRecord(error) && isRecord(error.reason) && typeof error.reason.message === "string") {
    message = error.reason.message
  } else {
    message = String(error)
  }
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

// Google Generative Language API framing
// Transforms Google's native streaming format (newline-delimited JSON) to individual JSON chunks
// Google format: each line is a complete JSON object (GeminiStreamChunk), optionally prefixed with "data: "
export const google: Framing<string> = {
  id: "google",
  frame: (bytes) =>
    Stream.unwrap(
      Effect.gen(function* () {
        let buf = ""
        const decoder = new TextDecoder()

        const parseChunk = (chunk: Uint8Array): string[] => {
          buf += decoder.decode(chunk, { stream: true })
          const lines = buf.split("\n")
          buf = lines.pop() || ""
          const out: string[] = []
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            // Google native format: raw JSON per line, or "data: {...}" SSE style
            if (trimmed.startsWith("data: ")) {
              out.push(trimmed.slice(6))
            } else if (trimmed === "[DONE]") {
              // ignore
            } else {
              out.push(trimmed)
            }
          }
          return out
        }

        return bytes.pipe(
          Stream.map((chunk) => parseChunk(chunk)),
          Stream.flatMap((chunks) => (chunks.length > 0 ? Stream.fromIterable(chunks) : Stream.empty)),
          Stream.concat(
            Stream.suspend(() => {
              const final = parseChunk(new TextEncoder().encode("\n"))
              return final.length > 0 ? Stream.fromIterable(final) : Stream.empty
            }),
          ),
          Stream.catchAll((error) => Stream.fail(toLLMError(error))),
        )
      }),
    ),
}

export * as Framing from "./framing"