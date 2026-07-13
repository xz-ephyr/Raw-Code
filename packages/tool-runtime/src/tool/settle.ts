import type { AnyTool, ToolRuntime } from './make';

const runtimeMap = new WeakMap<AnyTool, ToolRuntime>();

export function setRuntime(tool: AnyTool, runtime: ToolRuntime): void {
  runtimeMap.set(tool, runtime);
}

export function getRuntime(tool: AnyTool): ToolRuntime | undefined {
  return runtimeMap.get(tool);
}
