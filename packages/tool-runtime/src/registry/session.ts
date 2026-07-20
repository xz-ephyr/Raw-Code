import type { AnyTool } from '../tool/make';
import { listGlobal } from './global';
import type { FilterSource } from './materialize';

export interface SessionRegistryEntry {
  readonly tool: AnyTool;
  readonly source: FilterSource;
  readonly sessionID: string;
}

const sessionTools = new Map<string, Map<string, SessionRegistryEntry>>();

function getSessionMap(sessionID: string): Map<string, SessionRegistryEntry> {
  let map = sessionTools.get(sessionID);
  if (!map) {
    map = new Map<string, SessionRegistryEntry>();
    sessionTools.set(sessionID, map);
  }
  return map;
}

export function registerSession(sessionID: string, name: string, tool: AnyTool, source: FilterSource = 'session'): void {
  const map = getSessionMap(sessionID);
  if (map.has(name)) {
    console.warn(`[tool-runtime] Duplicate session tool registration: "${name}" for session "${sessionID}". Existing entry will be overwritten.`);
  }
  map.set(name, { tool, source, sessionID });
}

export function registerSessionBatch(sessionID: string, tools: Record<string, AnyTool>): void {
  for (const [name, tool] of Object.entries(tools)) {
    registerSession(sessionID, name, tool);
  }
}

export function getSession(sessionID: string, name: string): SessionRegistryEntry | undefined {
  const map = sessionTools.get(sessionID);
  return map?.get(name);
}

export function getMerged(sessionID: string, name: string): { tool: AnyTool; source: FilterSource } | undefined {
  const session = getSession(sessionID, name);
  if (session) return { tool: session.tool, source: 'session' };
  const global = listGlobal().get(name);
  if (global) return { tool: global.tool, source: global.source };
  return undefined;
}

export function listMerged(sessionID: string): Map<string, { tool: AnyTool; source: FilterSource }> {
  const merged = new Map<string, { tool: AnyTool; source: FilterSource }>();
  for (const [name, entry] of listGlobal()) {
    merged.set(name, { tool: entry.tool, source: entry.source });
  }
  const map = sessionTools.get(sessionID);
  if (map) {
    for (const [name, entry] of map) {
      merged.set(name, { tool: entry.tool, source: 'session' });
    }
  }
  return merged;
}

export function clearSession(sessionID: string): void {
  sessionTools.delete(sessionID);
}

export function clearAllSessions(): void {
  sessionTools.clear();
}
