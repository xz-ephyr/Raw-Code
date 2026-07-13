import { Deferred, Effect } from 'effect';

const pending = new Map<string, Deferred.Deferred<any, Error>>();

function makeKey(sessionID: string, toolCallID: string): string {
  return `${sessionID}:${toolCallID}`;
}

export function registerDeferred(
  sessionID: string,
  toolCallID: string,
  deferred: Deferred.Deferred<any, Error>,
): void {
  pending.set(makeKey(sessionID, toolCallID), deferred);
}

export function resolveDeferred(sessionID: string, toolCallID: string, answer: unknown): void {
  const k = makeKey(sessionID, toolCallID);
  const deferred = pending.get(k);
  if (deferred) {
    Effect.runFork(Deferred.succeed(deferred, answer));
    pending.delete(k);
  }
}

export function rejectDeferred(sessionID: string, toolCallID: string, error: Error): void {
  const k = makeKey(sessionID, toolCallID);
  const deferred = pending.get(k);
  if (deferred) {
    Effect.runFork(Deferred.fail(deferred, error));
    pending.delete(k);
  }
}

export function hasPendingDeferred(sessionID: string, toolCallID: string): boolean {
  return pending.has(makeKey(sessionID, toolCallID));
}

export function listPendingSessionDeferreds(sessionID: string): string[] {
  const results: string[] = [];
  for (const [k] of pending) {
    if (k.startsWith(`${sessionID}:`)) results.push(k.split(':')[1]);
  }
  return results;
}
