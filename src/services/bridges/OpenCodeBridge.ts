import type { CLIBridge, CommandResult, ModelInfo, AuthStatus } from '@/types/cli';

const OPCODE_SERVER_URL = 'http://localhost:3080';

export class OpenCodeBridge implements CLIBridge {
  id = 'opencode';
  private ws: WebSocket | null = null;
  private isConnected_ = false;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((e: Error) => void) | null = null;

  async connect(): Promise<void> {
    if (this.isConnected_) return;

    return new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;

      try {
        this.ws = new WebSocket(`ws://localhost:3080/ws`);
        this.ws.onopen = () => {
          this.isConnected_ = true;
          if (this.connectResolve) this.connectResolve();
          this.connectResolve = null;
          this.connectReject = null;
        };
        this.ws.onerror = () => {
          this.isConnected_ = false;
          if (this.connectReject) this.connectReject(new Error('WebSocket connection failed'));
          this.connectResolve = null;
          this.connectReject = null;
        };
        this.ws.onclose = () => {
          this.isConnected_ = false;
          this.reconnect();
        };
      } catch (e) {
        reject(e);
        this.connectResolve = null;
        this.connectReject = null;
        this.reconnect();
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.isConnected_ = false;
  }

  isConnected(): boolean {
    return this.isConnected_;
  }

  async execute(command: string, args?: string[]): Promise<CommandResult> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = { type: 'execute_command', command, args, request_id: crypto.randomUUID() };

      return new Promise((resolve) => {
        const handler = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'command_result') {
              this.ws?.removeEventListener('message', handler);
              resolve(data);
            }
          } catch { /* ignore */ }
        };

        this.ws!.addEventListener('message', handler);
        this.ws!.send(JSON.stringify(msg));
      });
    }

    try {
      const res = await fetch(`${OPCODE_SERVER_URL}/api/v1/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: command, args }),
      });
      return res.json();
    } catch (e: any) {
      return { success: false, error: e.message || 'Execute failed' };
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    try {
      const res = await fetch(`${OPCODE_SERVER_URL}/api/v1/models`);
      if (!res.ok) return [];
      const models: any[] = await res.json();
      return models
        .filter((m: any) => m.free !== false)
        .map((m: any) => ({
          id: `opencode/${m.id}`,
          name: m.name || m.id,
          free: true,
          provider: 'opencode',
          source: 'cli' as const,
          cliId: 'opencode',
        }));
    } catch {
      return [];
    }
  }

  async getAuthStatus(): Promise<AuthStatus> {
    try {
      const res = await fetch(`${OPCODE_SERVER_URL}/auth/status`);
      if (!res.ok) return { authenticated: false };
      const data = await res.json();
      return { authenticated: data.authenticated ?? false, method: data.method };
    } catch {
      return { authenticated: false };
    }
  }

  private reconnect() {
    if (this.connectResolve || this.connectReject) return;
    setTimeout(() => this.connect().catch(() => {}), 2000);
  }
}
