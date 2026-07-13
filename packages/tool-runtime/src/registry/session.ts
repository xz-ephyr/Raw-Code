import type { AnyTool } from '../tool/make';
import { listGlobal } from './global';
import type { FilterSource } from './materialize';

export interface SessionRegistryEntry {
  readonly tool: AnyTool;
  readonly source: 'session';
}

const sessionTools = new Map<string, SessionRegistryEntry>();

export function registerSession(name: string, tool: AnyTool): void {
  sessionTools.set(name, { tool, source: 'session' });
}

export function registerSessionBatch(tools: Record<string, AnyTool>): void {
  for (const [name, tool] of Object.entries(tools)) {
    sessionTools.set(name, { tool, source: 'session' });
  }
}

export function getSession(name: string): SessionRegistryEntry | undefined {
  return sessionTools.get(name);
}

export function getMerged(name: string): { tool: AnyTool; source: FilterSource } | undefined {
  const session = sessionTools.get(name);
  if (session) return { tool: session.tool, source: 'session' };
  const global = listGlobal().get(name);
  if (global) return { tool: global.tool, source: global.source };
  return undefined;
}

export function listMerged(): Map<string, { tool: AnyTool; source: FilterSource }> {
  const merged = new Map<string, { tool: AnyTool; source: FilterSource }>();
  for (const [name, entry] of listGlobal()) {
    merged.set(name, { tool: entry.tool, source: entry.source });
  }
  for (const [name, entry] of sessionTools) {
    merged.set(name, { tool: entry.tool, source: 'session' });
  }
  return merged;
}

export function clearSession(): void {
  sessionTools.clear();
}
