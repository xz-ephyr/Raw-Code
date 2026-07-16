export interface ToolOutputEntry {
  readonly sessionID: string;
  readonly toolName: string;
  readonly toolCallID: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly timestamp: number;
}

const MAX_STORE_SIZE = 10_000;
const store = new Map<string, ToolOutputEntry>();

function makeKey(sessionID: string, toolCallID: string): string {
  return `${sessionID}:${toolCallID}`;
}

function evictIfNeeded(): void {
  if (store.size >= MAX_STORE_SIZE) {
    const entries = [...store.entries()];
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, Math.floor(MAX_STORE_SIZE * 0.2));
    for (const [k] of toDelete) store.delete(k);
  }
}

export function putToolOutput(
  sessionID: string,
  toolCallID: string,
  toolName: string,
  input: unknown,
  output: unknown,
): void {
  evictIfNeeded();
  store.set(makeKey(sessionID, toolCallID), {
    sessionID,
    toolName,
    toolCallID,
    input,
    output,
    timestamp: Date.now(),
  });
}

export function getToolOutput(sessionID: string, toolCallID: string): ToolOutputEntry | undefined {
  return store.get(makeKey(sessionID, toolCallID));
}

export function listSessionOutputs(sessionID: string): ToolOutputEntry[] {
  const results: ToolOutputEntry[] = [];
  for (const entry of store.values()) {
    if (entry.sessionID === sessionID) results.push(entry);
  }
  return results;
}

export function clearSessionOutputs(sessionID: string): void {
  for (const [k, v] of store) {
    if (v.sessionID === sessionID) store.delete(k);
  }
}
