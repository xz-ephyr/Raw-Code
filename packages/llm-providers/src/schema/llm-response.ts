import { Schema } from "effect"
import { FinishReason } from "./ids"
import { LLMEvent, Usage, isToolCall } from "./event-schemas"
import type { ResponseState } from "./response-state"
import { emptyResponseState, reduceResponseState, responseText, responseReasoning, responseUsage } from "./response-state"

export class LLMResponse extends Schema.Class<LLMResponse>("LLM.Response")({
  message: Schema.Unknown as any,
  events: Schema.Array(LLMEvent),
  usage: Schema.optional(Usage),
  finishReason: FinishReason,
}) {
  get text() {
    return responseText(this.events as any)
  }

  get reasoning() {
    return responseReasoning(this.events as any)
  }

  get toolCalls() {
    return (this.events as any).filter(isToolCall)
  }
}

export const LLMResponseHelpers = {
  empty: emptyResponseState,
  reduce: reduceResponseState,
  complete: (state: ResponseState): LLMResponse | undefined =>
    state.finishReason === undefined
      ? undefined
      : new LLMResponse({
          message: state.message as any,
          events: [...state.events] as any,
          usage: state.usage as any,
          finishReason: state.finishReason,
        }),
  fromEvents: (events: ReadonlyArray<LLMEvent>) => {
    const state = events.reduce(reduceResponseState, emptyResponseState())
    return LLMResponseHelpers.complete(state)
  },
  text: (response: Output) => responseText(response.events),
  usage: (response: Output) => response.usage ?? responseUsage(response.events),
  toolCalls: (response: Output) => response.events.filter(isToolCall),
  reasoning: (response: Output) => responseReasoning(response.events),
}

type Output = LLMResponse | { readonly events: ReadonlyArray<LLMEvent>; readonly usage?: Usage }
