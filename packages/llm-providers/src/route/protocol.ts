import { Schema, type Effect } from "effect"
import type { LLMError, LLMEvent, LLMRequest, ProtocolID } from "../schema"

export interface Protocol<Body, Frame, Event, State> {
  readonly id: ProtocolID
  readonly body: ProtocolBody<Body>
  readonly stream: ProtocolStream<Frame, Event, State>
}

export interface ProtocolBody<Body> {
  readonly schema: Schema.Schema<Body, unknown>
  readonly from: (request: LLMRequest) => Effect.Effect<Body, LLMError>
}

export interface ProtocolStream<Frame, Event, State> {
  readonly event: Schema.Schema<Event, Frame>
  readonly initial: (request: LLMRequest) => State
  readonly step: (state: State, event: Event) => Effect.Effect<readonly [State, ReadonlyArray<LLMEvent>], LLMError>
  readonly terminal?: (event: Event) => boolean
  readonly onHalt?: (state: State) => ReadonlyArray<LLMEvent>
}

export const make = <Body, Frame, Event, State>(
  input: Protocol<Body, Frame, Event, State>,
): Protocol<Body, Frame, Event, State> => input

export const jsonEvent = <const S extends Schema.Schema<any, any>>(schema: S) => Schema.parseJson(schema)

export * as Protocol from "./protocol"
