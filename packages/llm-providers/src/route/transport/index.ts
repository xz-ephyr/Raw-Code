import type { Effect, Stream } from "effect"
import type { Endpoint } from "../endpoint"
import type { Auth } from "../auth"
import type { LLMError, LLMRequest } from "../../schema"

export interface TransportRuntime {
  readonly http: {
    readonly execute: (url: string, body: string, headers: Record<string, string>) => Effect.Effect<{
      readonly status: number
      readonly headers: Record<string, string>
      readonly text: Effect.Effect<string>
      readonly stream: ReadableStream<Uint8Array> | null
    }, Error>
  }
}

export interface Transport<Body, Prepared, Frame> {
  readonly id: string
  readonly prepare: (input: TransportPrepareInput<Body>) => Effect.Effect<Prepared, LLMError>
  readonly frames: (prepared: Prepared, request: LLMRequest, runtime: TransportRuntime) => Stream.Stream<Frame, LLMError>
}

export interface TransportPrepareInput<Body> {
  readonly body: Body
  readonly request: LLMRequest
  readonly endpoint: Endpoint<Body>
  readonly auth: Auth
  readonly encodeBody: (body: Body) => string
  readonly headers?: (input: { readonly request: LLMRequest }) => Record<string, string>
}

export * as HttpTransport from "./http"
