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

    const providerId = prepareInput.request.model.provider
    const bodyText = prepareInput.encodeBody(prepareInput.body)
    if (typeof process !== 'undefined' && process.env?.LLM_DEBUG && (providerId === "mistral" || providerId === "google")) {
      console.log(`[body:${providerId}]`, JSON.stringify(JSON.parse(bodyText), null, 2))
    }
      const headers = yield* Auth.toEffect(prepareInput.auth)({
        request: prepareInput.request,
        method: "POST",
        url,
        body: bodyText,
        headers: { ...(prepareInput.request.headers as Record<string, string> ?? {}), ...(prepareInput.headers?.({ request: prepareInput.request }) ?? {}), ...prepareInput.request.http?.headers },
      })
      return { url, bodyText, headers, framing: input.framing }
    }),
  frames: (prepared, request, runtime) => {
    const stream = Stream.unwrap(
      Effect.gen(function* () {
        // Defensive check: ensure framing exists on prepared. If missing, throw a clear error
        if (!prepared || !prepared.framing || typeof (prepared as any).framing.frame !== "function") {
          const routeId = request?.model?.route ?? (request?.model?.route?.id ?? "unknown")
          const modelId = request?.model?.id ?? "unknown"
          throw new Error(
            `[HttpTransport.frames] missing framing for prepared request. url=${prepared?.url} route=${routeId} model=${modelId}`,
          )
        }

        const res = yield* runtime.http.execute(prepared.url, prepared.bodyText, prepared.headers)
        if (res.status < 200 || res.status >= 300) {
          const responseText = yield* res.text
          if (typeof process !== 'undefined' && process.env?.LLM_DEBUG) {
            const urlPreview = prepared.url.length > 120 ? prepared.url.slice(0, 120) + "..." : prepared.url
            const bodyPreview = prepared.bodyText.length > 500 ? prepared.bodyText.slice(0, 500) + "..." : prepared.bodyText
            console.error(`[provider] HTTP ${res.status} ${urlPreview}
  response: ${responseText.slice(0, 1000)}
  body: ${bodyPreview}`)
          }
          // Surface rate-limit hints so the retry layer can honour Retry-After.
          let retryAfterMs: number | undefined
          const retryAfter = res.headers["retry-after"]
          if (retryAfter) {
            const secs = Number(retryAfter)
            retryAfterMs = Number.isFinite(secs) ? secs * 1000 : Date.parse(retryAfter) - Date.now()
          }
          return Stream.fail({
            _tag: "LLM.Error",
            module: "Transport",
            method: "frames",
            reason: {
              _tag: "ProviderInternal",
              status: res.status,
              retryAfterMs: res.status === 429 ? (retryAfterMs ?? 2000) : retryAfterMs,
              message: `HTTP ${res.status}: ${responseText.slice(0, 200)}`,
            },
          } as any)
        }
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