import type { ToolDef, ToolCategory } from '../types';

export class ToolRegistry {
  private tools = new Map<string, ToolDef>();

  register(tool: ToolDef): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDef | undefined {
    return this.tools.get(name);
  }

  list(): ToolDef[] {
    return Array.from(this.tools.values());
  }

  listByCategory(category: ToolCategory): ToolDef[] {
    return this.list().filter(t => t.category === category);
  }

  registerAll(tools: ToolDef[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  remove(name: string): void {
    this.tools.delete(name);
  }

  clear(): void {
    this.tools.clear();
  }
}
