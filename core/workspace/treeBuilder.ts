import { FileSystemService } from './FileSystemService';
import { DatabaseService } from '@core/utils/DatabaseService';
import { isHidden, normalizePrefix } from './fileUtils';
import type { FileEntry } from './FileSystemService';

const getTauriFs = () => import('@tauri-apps/plugin-fs');
const getTauriPath = () => import('@tauri-apps/api/path');

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

  async fromVirtualFS(basePath: string, webVirtualFS: Record<string, string>): Promise<FileEntry[]> {
    const prefix = normalizePrefix(basePath);
    const names = collectChildNames(Object.keys(webVirtualFS), prefix);

    return names.map((name) => {
      const fullPath = prefix + name;
      const isDirectory = Object.keys(webVirtualFS).some((k) => k.startsWith(fullPath + '/'));
      return { name, path: fullPath, isDirectory, children: undefined };
    });
  },
};

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

export { TreeBuilders, buildTreeFromPaths, collectChildNames };
