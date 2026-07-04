import type { CLIBridge } from '../types/cli';
import { OpenCodeBridge } from './bridges/OpenCodeBridge';

class CLIBridgeServiceImpl {
  private bridges = new Map<string, CLIBridge>();
  private listeners = new Set<(bridges: CLIBridge[]) => void>();

  onBridgesChange(cb: (bridges: CLIBridge[]) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    const all = Array.from(this.bridges.values());
    this.listeners.forEach((cb) => cb(all));
  }

  getBridges(): CLIBridge[] {
    return Array.from(this.bridges.values());
  }

  getBridge(id: string): CLIBridge | undefined {
    return this.bridges.get(id);
  }

  async connect(): Promise<void> {
    const bridge = new OpenCodeBridge();
    bridge.onReconnected = () => {
      if (!this.bridges.has('opencode')) {
        this.bridges.set('opencode', bridge);
        console.log('[CLI] Connected to opencode');
        window.dispatchEvent(new CustomEvent('opencode-connected'));
        this.notify();
      }
    };
    bridge.onDisconnected = () => {
      window.dispatchEvent(new CustomEvent('opencode-disconnected'));
    };
    try {
      await bridge.connect();
      if (bridge.isConnected()) {
        this.bridges.set('opencode', bridge);
        console.log('[CLI] Connected to opencode');
        window.dispatchEvent(new CustomEvent('opencode-connected'));
        this.notify();
      }
    } catch {
      // Will retry via WebSocket's internal reconnect, and onReconnected will register the bridge
    }
  }

  async disconnect(id: string): Promise<void> {
    const bridge = this.bridges.get(id);
    if (bridge) {
      await bridge.disconnect();
      this.bridges.delete(id);
      this.notify();
    }
  }
}

export const CLIBridgeService = new CLIBridgeServiceImpl();
