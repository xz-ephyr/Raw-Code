import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:3001';

interface ConnectorState {
  connected: boolean;
  identity: string | null;
  loading: boolean;
}

export function useConnectorStatus(provider: string) {
  const [state, setState] = useState<ConnectorState>({ connected: false, identity: null, loading: true });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/connector/${provider}/status`, { method: 'POST' });
      const data = await res.json();
      setState({ connected: data.connected, identity: data.identity, loading: false });
    } catch {
      setState({ connected: false, identity: null, loading: false });
    }
  }, [provider]);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...state, refresh };
}

const ALL_PROVIDERS = ['gmail', 'github', 'telegram', 'youtube', 'reddit', 'twitter'];

export function useAllConnectorsStatus() {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled(
      ALL_PROVIDERS.map(p =>
        fetch(`${API_BASE}/connector/${p}/status`, { method: 'POST' })
          .then(r => r.json())
          .then(d => [p, d.connected] as const)
      )
    );
    const connected: Record<string, boolean> = {};
    for (const r of results) {
      if (r.status === 'fulfilled') connected[r.value[0]] = r.value[1];
    }
    setStatuses(connected);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { statuses, loading, refresh };
}
