import { query } from '../db.js';
import { ConnectorService } from './base.js';

class ConnectorRegistry {
  private services = new Map<string, ConnectorService>();

  register(service: ConnectorService): void {
    this.services.set(service.provider, service);
  }

  get(provider: string): ConnectorService | undefined {
    return this.services.get(provider);
  }

  getAll(): ConnectorService[] {
    return Array.from(this.services.values());
  }

  getProviders(): string[] {
    return Array.from(this.services.keys());
  }

  async getConnectedProviders(): Promise<string[]> {
    if (this.services.size === 0) return [];
    const placeholders = this.getProviders().map((_, i) => `$${i + 1}`).join(', ');
    const result = await query<{ provider: string }>(
      `SELECT provider FROM oauth_tokens WHERE provider IN (${placeholders}) AND connected = 1`,
      this.getProviders()
    );
    return result.rows.map(r => r.provider);
  }
}

export const registry = new ConnectorRegistry();
