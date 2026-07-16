import type { AnyTool } from '../tool/make';

export interface GlobalRegistryEntry {
  readonly tool: AnyTool;
  readonly source: 'builtin' | 'connector' | 'content';
}

const globalTools = new Map<string, GlobalRegistryEntry>();

export function registerGlobal(name: string, tool: AnyTool, source: GlobalRegistryEntry['source'] = 'builtin'): void {
  if (globalTools.has(name)) {
    console.warn(`[tool-runtime] Duplicate global tool registration: "${name}" (source: ${source}). Existing entry will be overwritten.`);
  }
  globalTools.set(name, { tool, source });
}

export function registerGlobalBatch(
  tools: Record<string, AnyTool>,
  source: GlobalRegistryEntry['source'] = 'builtin',
): void {
  for (const [name, tool] of Object.entries(tools)) {
    if (globalTools.has(name)) {
      console.warn(`[tool-runtime] Duplicate global tool registration: "${name}" (source: ${source}). Existing entry will be overwritten.`);
    }
    globalTools.set(name, { tool, source });
  }
}

export function getGlobal(name: string): GlobalRegistryEntry | undefined {
  return globalTools.get(name);
}

export function listGlobal(): ReadonlyMap<string, GlobalRegistryEntry> {
  return globalTools;
}

export function clearGlobal(): void {
  globalTools.clear();
}
