import { isTauri } from '../utils/env';
import { DatabaseService } from '../utils/DatabaseService';

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

export interface FileContent {
  path: string;
  size: number;
  text: string;
}

export interface ProjectContent {
  tree: string;
  contents: FileContent[];
  truncated: boolean;
  skippedBinary: number;
  skippedSize: number;
}

const treeCache = new Map<string, { result: FileEntry[]; timestamp: number }>();
const TREE_CACHE_TTL = 2_000;

const webVirtualFS: Record<string, string> = {};
const SKIP_DIRS = new Set(['node_modules', '.git']);

function initVirtualFS() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('vfs:')) {
        const content = localStorage.getItem(key);
        if (content !== null) webVirtualFS[key.slice(4)] = content;
      }
    }
  } catch { /* localStorage not available */ }
}
initVirtualFS();

function getCachedTree(key: string): FileEntry[] | null {
  const cached = treeCache.get(key);
  if (cached && Date.now() - cached.timestamp < TREE_CACHE_TTL) return cached.result;
  return null;
}

function setCachedTree(key: string, result: FileEntry[]) {
  treeCache.set(key, { result, timestamp: Date.now() });
}

function clearTreeCache() {
  treeCache.clear();
}

function isHidden(name: string) {
  return name.startsWith('.') || SKIP_DIRS.has(name);
}

function normalizePrefix(prefix: string) {
  return prefix.endsWith('/') ? prefix : prefix + '/';
}

function collectChildNames(keys: string[], prefix: string): string[] {
  const p = normalizePrefix(prefix);
  const names = new Set<string>();
  for (const key of keys) {
    if (key.startsWith(p)) {
      const seg = key.slice(p.length).split('/')[0];
      if (seg) names.add(seg);
    }
  }
  return Array.from(names).filter((n) => !isHidden(n));
}

async function readDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string,
): Promise<{ path: string; content: string }[]> {
  const results: { path: string; content: string }[] = [];
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
}

const getTauriFs = () => import('@tauri-apps/plugin-fs');
const getTauriPath = () => import('@tauri-apps/api/path');

function serializeTree(entries: FileEntry[], indent = ''): string {
  return entries
    .map((e) => {
      const icon = e.isDirectory ? '📁' : '📄';
      const children = e.children ? serializeTree(e.children, indent + '  ') : '';
      return `${indent}${icon} ${e.name}${children ? '\n' + children : ''}`;
    })
    .join('\n');
}

async function readProjectFiles(
  entries: FileEntry[],
  projectId: string | undefined,
  maxTotal: number,
  maxFile: number,
): Promise<{ contents: FileContent[]; truncated: boolean; skippedBinary: number; skippedSize: number }> {
  const contents: FileContent[] = [];
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
          const raw = await FileSystemService.getFileContent(entry.path, projectId);
          if (!raw) return;
          if (FileSystemService.isLikelyBinary(raw)) { skippedBinary++; return; }
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

const TreeBuilders = {
  async tauri(basePath: string, depth: number, projectId?: string): Promise<FileEntry[]> {
    const { readDir } = await getTauriFs();
    const { join } = await getTauriPath();
    const entries = await readDir(basePath);
    const result: FileEntry[] = [];

    for (const entry of entries) {
      if (isHidden(entry.name)) continue;
      const fullPath = await join(basePath, entry.name);
      result.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory,
        children: entry.isDirectory
          ? await FileSystemService.getTree(fullPath, depth + 1, projectId)
          : undefined,
      });
    }
    return result;
  },

  async fromDatabase(basePath: string, projectId: string): Promise<FileEntry[]> {
    const prefix = normalizePrefix(basePath);
    const files = await DatabaseService.getProjectFiles(projectId);
    const paths = files.map(f => f.path);
    return buildTreeFromPaths(paths, prefix);
  },

  async fromVirtualFS(basePath: string): Promise<FileEntry[]> {
    const prefix = normalizePrefix(basePath);
    const names = collectChildNames(Object.keys(webVirtualFS), prefix);

    return names.map((name) => {
      const fullPath = prefix + name;
      const isDirectory = Object.keys(webVirtualFS).some((k) => k.startsWith(fullPath + '/'));
      return { name, path: fullPath, isDirectory, children: undefined };
    });
  },
};

function buildTreeFromPaths(paths: string[], prefix: string): FileEntry[] {
  return collectChildNames(paths, prefix).map((name) => {
    const fullPath = prefix + name;
    const isDirectory = paths.some((p) => p.startsWith(fullPath + '/'));
    return {
      name,
      path: fullPath,
      isDirectory,
      children: isDirectory ? buildTreeFromPaths(paths, fullPath) : undefined,
    };
  });
}

export const FileSystemService = {
  getTree: async (basePath: string, depth = 0, projectId?: string): Promise<FileEntry[]> => {
    if (depth > 20) return [];

    const cached = getCachedTree(basePath);
    if (cached) return cached;

    try {
      let result: FileEntry[];
      if (isTauri()) {
        result = await TreeBuilders.tauri(basePath, depth, projectId);
        // Resolve virtual entries (children were fetched recursively above)
      } else if (projectId) {
        result = await TreeBuilders.fromDatabase(basePath, projectId);
      } else {
        result = await TreeBuilders.fromVirtualFS(basePath);
      }

      // Resolve children for VFS entries (non-recursive builder)
      for (const entry of result) {
        if (entry.isDirectory && !entry.children) {
          entry.children = await FileSystemService.getTree(entry.path, depth + 1, projectId);
        }
      }

      setCachedTree(basePath, result);
      return result;
    } catch (e) {
      console.error('Error reading dir:', e);
      return [];
    }
  },

  getCompressedTree: (tree: FileEntry[]): string => {
    const summarize = (entries: FileEntry[], indent = ''): string => {
      return entries
        .map((e) => {
          if (e.isDirectory) {
            const childrenStr = summarize(e.children || [], indent + '  ');
            return `${indent}${e.name}/\n${childrenStr}`;
          }
          return `${indent}${e.name}`;
        })
        .join('\n');
    };

    return summarize(tree);
  },

  getFileContent: async (path: string, projectId?: string): Promise<string> => {
    if (isTauri()) {
      try {
        const { readFile } = await getTauriFs();
        const uint8Array = await readFile(path);
        return new TextDecoder().decode(uint8Array);
      } catch (e) {
        console.error('Error reading file:', e);
        return '';
      }
    }

    // Web with projectId: fetch from server DB
    if (projectId) {
      try {
        return await DatabaseService.getProjectFileContent(projectId, path);
      } catch (e) {
        console.error('Error reading file from server:', e);
        return '';
      }
    }

    // Web fallback: read from virtual FS
    return webVirtualFS[path] ?? '';
  },

  // Heuristic: check if content looks like binary (null bytes in first 4KB)
  isLikelyBinary: (content: string): boolean => {
    const sample = content.slice(0, 4096);
    for (let i = 0; i < sample.length; i++) {
      if (sample.charCodeAt(i) === 0) return true;
    }
    return false;
  },

  /** Walk the file tree recursively and read file contents with sensible limits. */
  getProjectContent: async (basePath: string, projectId?: string): Promise<ProjectContent> => {
    const MAX_TOTAL_CHARS = 60_000;
    const MAX_FILE_CHARS = 30_000;
    const tree = await FileSystemService.getTree(basePath, 0, projectId);

    const treeText = serializeTree(tree);
    const result = await readProjectFiles(tree, projectId, MAX_TOTAL_CHARS, MAX_FILE_CHARS);

    return {
      tree: treeText,
      contents: result.contents,
      truncated: result.truncated,
      skippedBinary: result.skippedBinary,
      skippedSize: result.skippedSize,
    };
  },

  importDirectory: async (dirHandle: FileSystemDirectoryHandle, projectId?: string): Promise<string> => {
    const name = dirHandle.name;
    const projectPath = '/web-projects/' + name;

    const files = await readDirectoryHandle(dirHandle, projectPath);

    // Upload to server DB if projectId is available
    if (projectId) {
      try {
        await DatabaseService.saveProjectFiles(projectId, files.map(f => ({ path: f.path, content: f.content })));
        return projectPath;
      } catch (e) {
        console.error('Error uploading files to server:', e);
      }
    }

    // Fallback: store in virtual FS
    webVirtualFS[projectPath + '/'] = '';
    for (const f of files) {
      webVirtualFS[f.path] = f.content;
      try {
        if (f.content.length < 500_000) {
          localStorage.setItem(`vfs:${f.path}`, f.content);
        }
      } catch { /* quota exceeded */ }
    }
    return projectPath;
  },

  /** Upload all files in a project's virtual FS path to the server DB. */
  uploadProjectFiles: async (projectId: string, projectPath: string): Promise<void> => {
    const prefix = projectPath.endsWith('/') ? projectPath : projectPath + '/';
    const files: { path: string; content: string }[] = [];
    for (const key of Object.keys(webVirtualFS)) {
      if (key.startsWith(prefix) && key !== prefix) {
        files.push({ path: key, content: webVirtualFS[key] });
      }
    }
    if (files.length === 0) return;
    await DatabaseService.saveProjectFiles(projectId, files);
    // Clear from localStorage after upload
    for (const f of files) {
      try { localStorage.removeItem(`vfs:${f.path}`); } catch { /* ignore */ }
      delete webVirtualFS[f.path];
    }
  },

  saveFile: async (path: string, content: string, projectId?: string): Promise<void> => {
    clearTreeCache();
    if (isTauri()) {
      try {
        const { writeFile, mkdir } = await getTauriFs();
        const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        const dirPath = lastSlash !== -1 ? path.substring(0, lastSlash) : '';
        if (dirPath) {
          try {
            await mkdir(dirPath, { recursive: true });
          } catch {
            // Directory may already exist — ignore
          }
        }
        await writeFile(path, new TextEncoder().encode(content));
      } catch (e) {
        console.error('Error writing file:', e);
        throw e;
      }
      return;
    }

    // Web with projectId: save to server DB
    if (projectId) {
      try {
        await DatabaseService.saveProjectFiles(projectId, [{ path, content }]);
        return;
      } catch (e) {
        console.error('Error saving file to server:', e);
      }
    }

    // Web fallback: persist to virtual in-memory FS
    webVirtualFS[path] = content;
    try {
      const storageKey = `vfs:${path}`;
      if (content.length < 500_000) {
        localStorage.setItem(storageKey, content);
      }
    } catch {
      // localStorage quota exceeded — in-memory only
    }
  },
};
