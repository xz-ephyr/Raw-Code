import { isTauri } from '@/lib/tauri';

type OutputCallback = (data: string) => void;
type ExitCallback = (exitCode: number) => void;

let listenOutput: ((cb: OutputCallback) => Promise<() => void>) | null = null;
let listenExit: ((cb: ExitCallback) => Promise<() => void>) | null = null;

async function ensureListeners() {
  if (listenOutput || !isTauri()) return;
  const { listen } = await import('@tauri-apps/api/event');
  listenOutput = (cb: OutputCallback) =>
    listen<{ data: string }>('terminal:output', (e) => cb(e.payload.data));
  listenExit = (cb: ExitCallback) =>
    listen<{ exit_code: number }>('terminal:exit', (e) => cb(e.payload.exit_code));
}

export class TerminalService {
  private static unlistenOutput: (() => void) | null = null;
  private static unlistenExit: (() => void) | null = null;
  private static outputBuffer = '';
  private static onOutput: OutputCallback | null = null;
  private static onExit: ExitCallback | null = null;

  static async spawn(
    cols: number,
    rows: number,
    callbacks: { onOutput: OutputCallback; onExit: ExitCallback },
  ): Promise<void> {
    if (!isTauri()) {
      console.warn('Terminal is only available in the Tauri desktop app');
      return;
    }

    const { invoke } = await import('@tauri-apps/api/core');
    await ensureListeners();

    this.cleanup();

    this.onOutput = callbacks.onOutput;
    this.onExit = callbacks.onExit;

    if (listenOutput) {
      this.unlistenOutput = await listenOutput((data) => {
        this.outputBuffer += data;
        this.onOutput?.(data);
      });
    }

    if (listenExit) {
      this.unlistenExit = await listenExit((exitCode) => {
        this.onExit?.(exitCode);
        this.cleanup();
      });
    }

    await invoke('spawn_terminal', { cols, rows });
  }

  static async write(input: string): Promise<void> {
    if (!isTauri()) return;
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('write_to_terminal', { input });
  }

  static async resize(cols: number, rows: number): Promise<void> {
    if (!isTauri()) return;
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('resize_terminal', { cols, rows });
  }

  static async kill(): Promise<void> {
    if (!isTauri()) return;
    const { invoke } = await import('@tauri-apps/api/core');
    try {
      await invoke('kill_terminal');
    } catch { /* session already dead */ }
    this.cleanup();
  }

  private static cleanup() {
    this.unlistenOutput?.();
    this.unlistenOutput = null;
    this.unlistenExit?.();
    this.unlistenExit = null;
    this.outputBuffer = '';
    this.onOutput = null;
    this.onExit = null;
  }

  static getBuffer(): string {
    return this.outputBuffer;
  }

  static clearBuffer() {
    this.outputBuffer = '';
  }
}
