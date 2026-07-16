import { Context, Effect, Layer } from "effect"

export interface RequestExecutor {
  readonly execute: (url: string, body: string, headers: Record<string, string>) => Effect.Effect<{
    readonly status: number
    readonly headers: Record<string, string>
    readonly text: Effect.Effect<string>
    readonly stream: ReadableStream<Uint8Array> | null
  }, Error>
}

export const RequestExecutorTag = Context.GenericTag<RequestExecutor>("@doktor/llm/RequestExecutor")

export const RequestExecutorLive = Layer.succeed(
  RequestExecutorTag,
  RequestExecutorTag.of({
    execute: (url, body, headers) =>
      Effect.tryPromise({
        try: async () => {
          const res = await fetch(url, { method: "POST", headers, body })
          return {
            status: res.status,
            headers: Object.fromEntries(res.headers.entries()),
            text: Effect.promise(() => res.text()),
            stream: res.body,
          }
        },
        catch: (err) => new Error(`HTTP request failed: ${err}`),
      }),
  }),
)
