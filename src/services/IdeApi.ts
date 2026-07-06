const SERVER_URL = 'http://localhost:3001';

async function request<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${SERVER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface IdeTreeData {
  tree: string | null;
}

export async function getIdeFiles(): Promise<IdeTreeData> {
  return request('/get_ide_files', {});
}

export async function saveIdeFiles(tree: unknown): Promise<{ success: boolean }> {
  return request('/save_ide_files', { tree });
}
