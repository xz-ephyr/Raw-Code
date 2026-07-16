import { Effect, Context, Layer, Option } from 'effect';
import type { ToolEvent } from './events';

export interface EventStore {
  readonly append: (event: ToolEvent) => Effect.Effect<void, Error>;
  readonly getEvents: (sessionID: string) => Effect.Effect<readonly ToolEvent[], Error>;
  readonly getLatestEvent: (sessionID: string) => Effect.Effect<Option.Option<ToolEvent>, Error>;
}

export const EventStore = Context.GenericTag<EventStore>('@doktor/EventStore');

export class InMemoryEventStore implements EventStore {
  private events = new Map<string, ToolEvent[]>();

  private static readonly MAX_EVENTS_PER_SESSION = 500;

  append = (event: ToolEvent) =>
    Effect.sync(() => {
      const sessionEvents = this.events.get(event.sessionID) ?? [];
      sessionEvents.push(event);
      if (sessionEvents.length > InMemoryEventStore.MAX_EVENTS_PER_SESSION) {
        sessionEvents.splice(0, sessionEvents.length - InMemoryEventStore.MAX_EVENTS_PER_SESSION);
      }
      this.events.set(event.sessionID, sessionEvents);
    });

  getEvents = (sessionID: string) =>
    Effect.sync(() => this.events.get(sessionID) ?? []);

  getLatestEvent = (sessionID: string) =>
    Effect.sync(() => {
      const sessionEvents = this.events.get(sessionID);
      return sessionEvents && sessionEvents.length > 0
        ? Option.some(sessionEvents[sessionEvents.length - 1])
        : Option.none();
    });
}

export const EventStoreLive = Layer.succeed(EventStore, new InMemoryEventStore());