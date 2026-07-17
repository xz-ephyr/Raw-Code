import { Stream } from "effect"
import type { LLMError } from "./errors"
import type { LLMEvent } from "./event-schemas"
import type { LLMRequest } from "./messages"

export interface LLMAdapter {
  readonly stream: (
    request: LLMRequest,
    signal?: AbortSignal,
  ) => Stream.Stream<LLMEvent, LLMError>
}
