import type { ProviderMetadata, FinishReason } from "./ids"
import type { ContentPart } from "./messages"
import { ToolCallPart, ToolResultPart } from "./messages"
import type { Usage } from "./event-schemas"
import type {
  LLMEvent,
  TextDelta,
  TextEnd,
  ReasoningDelta,
  ReasoningEnd,
  ToolInputStart,
  ToolInputDelta,
  ToolInputEnd,
  ToolCall_,
  ToolResult_,
} from "./event-schemas"
import {
  isFinish,
  isProviderError,
  isTextDelta,
  isReasoningDelta,
} from "./event-schemas"

export const responseText = (events: ReadonlyArray<LLMEvent>) =>
  events
    .filter(isTextDelta)
    .map((event) => event.text)
    .join("")

export const responseReasoning = (events: ReadonlyArray<LLMEvent>) =>
  events
    .filter(isReasoningDelta)
    .map((event) => event.text)
    .join("")

export const responseUsage = (events: ReadonlyArray<LLMEvent>) =>
  events.reduce<Usage | undefined>(
    (usage, event) => ("usage" in event && event.usage !== undefined ? event.usage : usage),
    undefined,
  )

interface ContentAssembly {
  readonly contentIndex: number
  readonly text: string
  readonly providerMetadata?: ProviderMetadata
}

interface ToolInputAssembly {
  readonly name: string
  readonly text: string
  readonly providerMetadata?: ProviderMetadata
}

export interface ResponseState {
  readonly events: ReadonlyArray<LLMEvent>
  readonly message: { readonly role: string; readonly content: ReadonlyArray<ContentPart> }
  readonly usage?: Usage
  readonly finishReason?: FinishReason
  readonly textParts: Readonly<Record<string, ContentAssembly>>
  readonly reasoningParts: Readonly<Record<string, ContentAssembly>>
  readonly toolInputs: Readonly<Record<string, ToolInputAssembly>>
}

export const emptyResponseState = (): ResponseState => ({
  events: [],
  message: { role: "assistant", content: [] },
  textParts: {},
  reasoningParts: {},
  toolInputs: {},
})

const appendEvent = (state: ResponseState, event: LLMEvent): ResponseState => {
  const events = [...state.events, event]
  if (isFinish(event)) {
    return {
      ...state,
      events,
      usage: event.usage ?? state.usage,
      finishReason: event.reason,
    }
  }
  if (isProviderError(event)) {
    return {
      ...state,
      events,
      finishReason: state.finishReason ?? "error",
    }
  }
  return {
    ...state,
    events,
    usage: "usage" in event && event.usage !== undefined ? event.usage : state.usage,
  }
}

const textContent = (text: string, providerMetadata: ProviderMetadata | undefined): ContentPart =>
  providerMetadata === undefined ? { type: "text", text } : { type: "text", text, providerMetadata } as any

const reasoningContent = (text: string, providerMetadata: ProviderMetadata | undefined): ContentPart =>
  providerMetadata === undefined ? { type: "reasoning", text } : { type: "reasoning", text, providerMetadata } as any

const contentWith = (state: ResponseState, content: ReadonlyArray<ContentPart>): ResponseState => ({
  ...state,
  message: { role: "assistant", content } as any,
})

const appendContent = (state: ResponseState, part: ContentPart) => contentWith(state, [...state.message.content, part])

const replaceContent = (state: ResponseState, index: number, part: ContentPart) =>
  contentWith(
    state,
    state.message.content.map((item, itemIndex) => (itemIndex === index ? part : item)),
  )

const ensureText = (state: ResponseState, id: string, providerMetadata?: ProviderMetadata): ResponseState => {
  if (state.textParts[id]) return state
  return {
    ...appendContent(state, textContent("", providerMetadata)),
    textParts: {
      ...state.textParts,
      [id]: { contentIndex: state.message.content.length, text: "", providerMetadata },
    },
  }
}

const reduceTextDelta = (state: ResponseState, event: TextDelta): ResponseState => {
  const started = ensureText(state, event.id, event.providerMetadata)
  const current = started.textParts[event.id]
  if (!current) return started
  const text = current.text + event.text
  const providerMetadata = event.providerMetadata ?? current.providerMetadata
  return {
    ...replaceContent(started, current.contentIndex, textContent(text, providerMetadata)),
    textParts: { ...started.textParts, [event.id]: { ...current, text, providerMetadata } },
  }
}

const reduceTextEnd = (state: ResponseState, event: TextEnd): ResponseState => {
  const current = state.textParts[event.id]
  if (!current) return state
  const providerMetadata = event.providerMetadata ?? current.providerMetadata
  return {
    ...replaceContent(state, current.contentIndex, textContent(current.text, providerMetadata)),
    textParts: { ...state.textParts, [event.id]: { ...current, providerMetadata } },
  }
}

const ensureReasoning = (state: ResponseState, id: string, providerMetadata?: ProviderMetadata): ResponseState => {
  if (state.reasoningParts[id]) return state
  return {
    ...appendContent(state, reasoningContent("", providerMetadata)),
    reasoningParts: {
      ...state.reasoningParts,
      [id]: { contentIndex: state.message.content.length, text: "", providerMetadata },
    },
  }
}

const reduceReasoningDelta = (state: ResponseState, event: ReasoningDelta): ResponseState => {
  const started = ensureReasoning(state, event.id, event.providerMetadata)
  const current = started.reasoningParts[event.id]
  if (!current) return started
  const text = current.text + event.text
  const providerMetadata = event.providerMetadata ?? current.providerMetadata
  return {
    ...replaceContent(started, current.contentIndex, reasoningContent(text, providerMetadata)),
    reasoningParts: { ...started.reasoningParts, [event.id]: { ...current, text, providerMetadata } },
  }
}

const reduceReasoningEnd = (state: ResponseState, event: ReasoningEnd): ResponseState => {
  const current = state.reasoningParts[event.id]
  if (!current) return state
  const providerMetadata = event.providerMetadata ?? current.providerMetadata
  return {
    ...replaceContent(state, current.contentIndex, reasoningContent(current.text, providerMetadata)),
    reasoningParts: { ...state.reasoningParts, [event.id]: { ...current, providerMetadata } },
  }
}

const reduceToolInputStart = (state: ResponseState, event: ToolInputStart): ResponseState => ({
  ...state,
  toolInputs: {
    ...state.toolInputs,
    [event.id]: { name: event.name, text: "", providerMetadata: event.providerMetadata },
  },
})

const reduceToolInputDelta = (state: ResponseState, event: ToolInputDelta): ResponseState => {
  const current = state.toolInputs[event.id] ?? { name: event.name, text: "" }
  return {
    ...state,
    toolInputs: { ...state.toolInputs, [event.id]: { ...current, text: current.text + event.text } },
  }
}

const reduceToolInputEnd = (state: ResponseState, event: ToolInputEnd): ResponseState => {
  const current = state.toolInputs[event.id] ?? { name: event.name, text: "" }
  return {
    ...state,
    toolInputs: {
      ...state.toolInputs,
      [event.id]: {
        ...current,
        name: event.name,
        providerMetadata: event.providerMetadata ?? current.providerMetadata,
      },
    },
  }
}

const toolCallContent = (event: ToolCall_): ContentPart =>
  ToolCallPart.make({
    id: event.id,
    name: event.name,
    input: event.input,
    ...(event.providerExecuted === undefined ? {} : { providerExecuted: event.providerExecuted }),
    ...(event.providerMetadata === undefined ? {} : { providerMetadata: event.providerMetadata }),
  })

const toolResultContent = (event: ToolResult_): ContentPart =>
  ToolResultPart.make({
    id: event.id,
    name: event.name,
    result: event.result,
    ...(event.providerExecuted === undefined ? {} : { providerExecuted: event.providerExecuted }),
    ...(event.providerMetadata === undefined ? {} : { providerMetadata: event.providerMetadata }),
  })

const reduceToolCall = (state: ResponseState, event: ToolCall_): ResponseState => {
  const { [event.id]: _finished, ...toolInputs } = state.toolInputs
  return { ...appendContent(state, toolCallContent(event)), toolInputs }
}

export const reduceResponseState = (state: ResponseState, event: LLMEvent): ResponseState => {
  const next = appendEvent(state, event)
  switch (event.type) {
    case "text-start":
      return ensureText(next, event.id, event.providerMetadata)
    case "text-delta":
      return reduceTextDelta(next, event as any)
    case "text-end":
      return reduceTextEnd(next, event as any)
    case "reasoning-start":
      return ensureReasoning(next, event.id, event.providerMetadata)
    case "reasoning-delta":
      return reduceReasoningDelta(next, event as any)
    case "reasoning-end":
      return reduceReasoningEnd(next, event as any)
    case "tool-input-start":
      return reduceToolInputStart(next, event as any)
    case "tool-input-delta":
      return reduceToolInputDelta(next, event as any)
    case "tool-input-end":
      return reduceToolInputEnd(next, event as any)
    case "tool-call":
      return reduceToolCall(next, event as any)
    case "tool-result":
      return appendContent(next, toolResultContent(event as any))
    default:
      return next
  }
}
