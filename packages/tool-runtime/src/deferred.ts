import { Deferred, Effect } from 'effect';

const DEFERRED_TTL_MS = 5 * 60 * 1000;

interface DeferredEntry {
  deferred: Deferred.Deferred<any, Error>;
  timeout: ReturnType<typeof setTimeout>;
}

const pending = new Map<string, DeferredEntry>();

function makeKey(sessionID: string, toolCallID: string): string {
  return `${sessionID}:${toolCallID}`;
}

export function registerDeferred(
  sessionID: string,
  toolCallID: string,
  deferred: Deferred.Deferred<any, Error>,
  ttlMs: number = DEFERRED_TTL_MS,
): void {
  const key = makeKey(sessionID, toolCallID);
  const timeout = setTimeout(() => {
    const entry = pending.get(key);
    if (entry) {
      Effect.runFork(Deferred.fail(entry.deferred, new Error(`Deferred timed out after ${ttlMs}ms`)));
      pending.delete(key);
    }
  }, ttlMs);
  pending.set(key, { deferred, timeout });
}

export function resolveDeferred(sessionID: string, toolCallID: string, answer: unknown): void {
  const k = makeKey(sessionID, toolCallID);
  const entry = pending.get(k);
  if (entry) {
    clearTimeout(entry.timeout);
    Effect.runFork(Deferred.succeed(entry.deferred, answer));
    pending.delete(k);
  }
}

export function rejectDeferred(sessionID: string, toolCallID: string, error: Error): void {
  const k = makeKey(sessionID, toolCallID);
  const entry = pending.get(k);
  if (entry) {
    clearTimeout(entry.timeout);
    Effect.runFork(Deferred.fail(entry.deferred, error));
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

export function clearSessionDeferreds(sessionID: string): void {
  const prefix = `${sessionID}:`;
  for (const [k, entry] of pending) {
    if (k.startsWith(prefix)) {
      clearTimeout(entry.timeout);
      Effect.runFork(Deferred.fail(entry.deferred, new Error('Session ended')));
      pending.delete(k);
    }
  }
}
