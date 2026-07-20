export const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3001');

export const API_KEY = import.meta.env.VITE_API_KEY || '';

export function apiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  if (API_KEY) h['x-api-key'] = API_KEY;
  return h;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const init = { ...options };
  if (API_KEY) {
    init.headers = { ...init.headers as Record<string, string>, 'x-api-key': API_KEY };
  }
  return fetch(url, init);
}
