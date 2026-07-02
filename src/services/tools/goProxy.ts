const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:3002';
const AGENT_API_KEY = import.meta.env.VITE_AGENT_API_KEY || '';
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 200;

interface GoToolResult {
  result: any;
  error: string | null;
  durationMs: number;
}

/** Fetch with simple exponential backoff for transient failures. */
async function fetchWithRetry(
  url: string,
  opts: RequestInit,
  retries: number,
  idempotent: boolean
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, opts);
      if (res.ok || !idempotent || attempt >= retries) return res;
    } catch (e) {
      if (!idempotent || attempt >= retries) throw e;
    }
    await new Promise((r) => setTimeout(r, BASE_DELAY_MS * (1 << attempt)));
  }
}

export async function callGoTool(
  tool: string,
  params: Record<string, any>,
  options: { idempotent?: boolean; timeout?: number } = {}
): Promise<any> {
  const { idempotent = true, timeout = 8000 } = options;

  const res = await fetchWithRetry(
    `${AGENT_URL}/api/tools/execute`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AGENT_API_KEY,
      },
      body: JSON.stringify({ tool, params }),
      signal: AbortSignal.timeout(timeout),
    },
    MAX_RETRIES,
    idempotent
  );

  if (!res.ok) {
    let errMsg: string;
    try {
      const body = await res.json();
      errMsg = body.error || res.statusText;
    } catch {
      errMsg = res.statusText;
    }
    throw new Error(errMsg);
  }

  const data: GoToolResult = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}
