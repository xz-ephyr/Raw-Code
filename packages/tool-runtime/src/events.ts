export type ToolEventType =
  | 'tool_call_start'
  | 'tool_call_end'
  | 'step_start'
  | 'step_end'
  | 'question_pending'
  | 'question_answered'
  | 'subagent_start'
  | 'subagent_end'
  | 'subagent_step'
  | 'error';

export interface ToolEvent {
  readonly type: ToolEventType;
  readonly sessionID: string;
  readonly agentID: string;
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
}

type EventHandler = (event: ToolEvent) => void;

const handlers = new Map<ToolEventType, Set<EventHandler>>();
const globalHandlers = new Set<EventHandler>();

export function onEvent(type: ToolEventType, handler: EventHandler): () => void {
  let set = handlers.get(type);
  if (!set) {
    set = new Set();
    handlers.set(type, set);
  }
  set.add(handler);
  return () => { set?.delete(handler); };
}

export function onAnyEvent(handler: EventHandler): () => void {
  globalHandlers.add(handler);
  return () => { globalHandlers.delete(handler); };
}

export function emit(event: ToolEvent): void {
  const typeHandlers = handlers.get(event.type);
  if (typeHandlers) {
    for (const h of typeHandlers) h(event);
  }
  for (const h of globalHandlers) h(event);
}

export function clearAllHandlers(): void {
  handlers.clear();
  globalHandlers.clear();
}
