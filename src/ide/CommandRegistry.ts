import type { Command } from './types';

export class CommandRegistry {
  private commands: Map<string, Command> = new Map();

  register(command: Command): void {
    this.commands.set(command.id, command);
  }

  execute(id: string, ...args: any[]): void {
    const command = this.commands.get(id);
    if (!command) throw new Error(`Command not found: ${id}`);
    command.execute(...args);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  getByShortcut(shortcut: string): Command | undefined {
    for (const command of this.commands.values()) {
      if (command.shortcut === shortcut) return command;
    }
    return undefined;
  }
}
