import { Effect, Layer, Option } from 'effect';
import { EventStore } from './event-store';
import type { ToolEvent } from './events';

const BASE_URL = 'http://127.0.0.1:3001';

export class RemoteEventStore implements EventStore {
  private latestEventCache = new Map<string, ToolEvent>();

  append = (event: ToolEvent) => {
    this.latestEventCache.set(event.sessionID, event);
    return Effect.tryPromise({
      try: () =>
        fetch(`${BASE_URL}/events/append`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: event.type,
            sessionId: event.sessionID,
            agentId: event.agentID,
            timestamp: event.timestamp,
            payload: event.payload,
          }),
        }),
      catch: (err) => new Error(`Failed to append event: ${err}`),
    });
  };

  getEvents = (sessionID: string) =>
    Effect.tryPromise({
      try: async () => {
        const res = await fetch(`${BASE_URL}/events/${sessionID}`);
        if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
        const data = await res.json();
        return data.map((e: any) => ({
          type: e.type,
          sessionID: e.session_id,
          agentID: e.agent_id,
          timestamp: e.timestamp,
          payload: e.payload,
        })) as readonly ToolEvent[];
      },
      catch: (err) => new Error(`Failed to get events: ${err}`),
    });

  getLatestEvent = (sessionID: string) =>
    Effect.sync(() => {
      const cached = this.latestEventCache.get(sessionID);
      return cached ? Option.some(cached) : Option.none();
    });
}

export const RemoteEventStoreLive = Layer.succeed(EventStore, new RemoteEventStore());
