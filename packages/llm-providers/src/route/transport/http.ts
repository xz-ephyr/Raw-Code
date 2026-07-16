import { Effect, Stream } from "effect"
import { Auth } from "../auth"
import { render as renderEndpoint } from "../endpoint"
import { type Framing } from "../framing"
import type { Transport } from "./index"
import type { LLMError } from "../../schema"
import { isRecord } from "../../utils/record"

export interface HttpPrepared<Frame> {
  readonly url: string
  readonly bodyText: string
  readonly headers: Record<string, string>
  readonly framing: Framing<Frame>
}

export interface HttpJsonTransport<Body, Frame> extends Transport<Body, HttpPrepared<Frame>, Frame> {
  readonly with: (patch: { readonly framing?: Framing<Frame> }) => HttpJsonTransport<Body, Frame>
}

const toLLMError = (error: unknown): LLMError => {
  const message = isRecord(error) && typeof error.message === "string" ? error.message : String(error)
  return { _tag: "LLM.Error", module: "Transport", method: "frames", reason: { _tag: "Transport", message } } as any
}

export const httpJson = <Body, Frame>(input: { readonly framing: Framing<Frame> }): HttpJsonTransport<Body, Frame> => ({
  id: "http-json",
  with: (patch) => httpJson({ ...input, ...patch }),
  prepare: (prepareInput) =>
    Effect.gen(function* () {
      const url = renderEndpoint(prepareInput.endpoint, {
        request: prepareInput.request,
        body: prepareInput.body,
      }).toString()
      const bodyText = prepareInput.encodeBody(prepareInput.body)
      const headers = yield* Auth.toEffect(prepareInput.auth)({
        request: prepareInput.request,
        method: "POST",
        url,
        body: bodyText,
        headers: { ...(prepareInput.headers?.({ request: prepareInput.request }) ?? {}), ...prepareInput.request.http?.headers },
      })
      return { url, bodyText, headers, framing: input.framing }
    }),
  frames: (prepared, _request, runtime) => {
    const stream = Stream.unwrap(
      Effect.gen(function* () {
        const res = yield* runtime.http.execute(prepared.url, prepared.bodyText, prepared.headers)
        if (res.stream) {
          const bytes = Stream.fromReadableStream({
            evaluate: () => res.stream as ReadableStream<Uint8Array>,
            onError: (err) => err,
          })
          return prepared.framing.frame(bytes as any) as any
        }
        return Stream.empty
      }),
    )
    return stream.pipe(
      Stream.catchAll((error) => Stream.fail(toLLMError(error))),
    ) as any
  },
})