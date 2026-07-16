import type { FileEntry } from './FileSystemService';

export const SKIP_DIRS = new Set(['node_modules', '.git']);

export function isHidden(name: string) {
  return name.startsWith('.') || SKIP_DIRS.has(name);
}

export function normalizePrefix(prefix: string) {
  return prefix.endsWith('/') ? prefix : prefix + '/';
}

export function isLikelyBinary(content: string): boolean {
  const sample = content.slice(0, 4096);
  for (let i = 0; i < sample.length; i++) {
    if (sample.charCodeAt(i) === 0) return true;
  }
  return false;
}

export function serializeTree(entries: FileEntry[], indent = ''): string {
  return entries
    .map((e) => {
      const icon = e.isDirectory ? '📁' : '📄';
      const children = e.children ? serializeTree(e.children, indent + '  ') : '';
      return `${indent}${icon} ${e.name}${children ? '\n' + children : ''}`;
    })
    .join('\n');
}

export function readDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string,
): Promise<{ path: string; content: string }[]> {
  const results: { path: string; content: string }[] = [];
  return (async () => {
    for await (const [name, handle] of (dirHandle as any).entries()) {
      const fullPath = `${basePath}/${name}`;
      if (handle.kind === 'directory') {
        results.push(...await readDirectoryHandle(handle as FileSystemDirectoryHandle, fullPath));
      } else {
        try {
          const file = await (handle as FileSystemFileHandle).getFile();
          results.push({ path: fullPath, content: await file.text() });
        } catch { /* skip */ }
      }
    }
    return results;
  })();
}

export async function readProjectFiles(
  entries: FileEntry[],
  projectId: string | undefined,
  maxTotal: number,
  maxFile: number,
  getFileContent: (path: string, projectId?: string) => Promise<string>,
): Promise<{ contents: { path: string; size: number; text: string }[]; truncated: boolean; skippedBinary: number; skippedSize: number }> {
  const contents: { path: string; size: number; text: string }[] = [];
  let totalChars = 0;
  let skippedBinary = 0;
  let skippedSize = 0;
  let truncated = false;

  const walk = async (list: FileEntry[]) => {
    const jobs: Promise<void>[] = [];
    for (const entry of list) {
      if (entry.isDirectory && entry.children) {
        jobs.push(walk(entry.children));
      } else if (!entry.isDirectory) {
        jobs.push((async () => {
          if (totalChars >= maxTotal) { truncated = true; return; }
          const raw = await getFileContent(entry.path, projectId);
          if (!raw) return;
          if (isLikelyBinary(raw)) { skippedBinary++; return; }
          if (raw.length > maxFile) { skippedSize++; return; }
          totalChars += raw.length;
          if (totalChars > maxTotal) { truncated = true; return; }
          contents.push({ path: entry.path, size: raw.length, text: raw });
        })());
      }
    }
    await Promise.all(jobs);
  };

  await walk(entries);
  return { contents, truncated, skippedBinary, skippedSize };
}
