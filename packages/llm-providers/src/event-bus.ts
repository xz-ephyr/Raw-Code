import type { LLMEvent } from "./schema/event-schemas"

type EventHandler = (event: LLMEvent) => void
type Unsubscribe = () => void

const handlers = new Set<EventHandler>()

export function onLLMEvent(handler: EventHandler): Unsubscribe {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export function emitLLMEvent(event: LLMEvent): void {
  for (const h of handlers) h(event)
}

export function clearLLMEventHandlers(): void {
  handlers.clear()
}
