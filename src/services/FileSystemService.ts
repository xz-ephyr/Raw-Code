import { isTauri } from '../lib/tauri';

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

// In-memory virtual filesystem for web-browser mode
const webVirtualFS: Record<string, string> = {};

// Restore previously saved files from localStorage on initialisation
try {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('vfs:')) {
      const path = key.slice(4);
      const content = localStorage.getItem(key);
      if (content !== null) {
        webVirtualFS[path] = content;
      }
    }
  }
} catch {
  // localStorage not available
}

// Recursively read all files from a FileSystemDirectoryHandle into the virtual FS
async function importDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string,
): Promise<void> {
  for await (const [name, handle] of (dirHandle as any).entries()) {
    const fullPath = basePath + '/' + name;
    if (handle.kind === 'directory') {
      await importDirectoryHandle(handle as FileSystemDirectoryHandle, fullPath);
    } else {
      try {
        const file = await (handle as FileSystemFileHandle).getFile();
        webVirtualFS[fullPath] = await file.text();
      } catch {
        // skip files that can't be read
      }
    }
  }
}

// ------------------------------------------------------------------
// Tauri-only dynamic imports (to avoid crashing in a browser build)
// ------------------------------------------------------------------
const getTauriFs = async () => {
  return import('@tauri-apps/plugin-fs');
};

const getTauriPath = async () => {
  return import('@tauri-apps/api/path');
};

export const FileSystemService = {
  getTree: async (basePath: string, depth = 0): Promise<FileEntry[]> => {
    if (depth > 20) return [];

    if (isTauri()) {
      try {
        const { readDir } = await getTauriFs();
        const { join } = await getTauriPath();
        const entries = await readDir(basePath);
        const result: FileEntry[] = [];

        for (const entry of entries) {
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          const fullPath = await join(basePath, entry.name);
          const isDirectory = entry.isDirectory;
          result.push({
            name: entry.name,
            path: fullPath,
            isDirectory,
            children: isDirectory
              ? await FileSystemService.getTree(fullPath, depth + 1)
              : undefined,
          });
        }
        return result;
      } catch (e) {
        console.error('Error reading dir:', e);
        return [];
      }
    }

    // Web fallback: derive tree structure from in-memory virtual FS keys
    try {
      const prefix = basePath.endsWith('/') ? basePath : basePath + '/';
      const childNames = new Set<string>();

      for (const key of Object.keys(webVirtualFS)) {
        if (key.startsWith(prefix)) {
          const rest = key.slice(prefix.length);
          const firstSegment = rest.split('/')[0];
          if (firstSegment) childNames.add(firstSegment);
        }
      }

      const result: FileEntry[] = [];
      for (const name of childNames) {
        if (name.startsWith('.') || name === 'node_modules') continue;
        const fullPath = prefix + name;
        const isDirectory = Object.keys(webVirtualFS).some((k) => k.startsWith(fullPath + '/'));
        result.push({
          name,
          path: fullPath,
          isDirectory,
          children: isDirectory ? await FileSystemService.getTree(fullPath, depth + 1) : undefined,
        });
      }
      return result;
    } catch (e) {
      console.error('Error reading virtual dir:', e);
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

  getFileContent: async (path: string): Promise<string> => {
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

    // Web fallback: read from virtual FS
    return webVirtualFS[path] ?? '';
  },

  importDirectory: async (dirHandle: FileSystemDirectoryHandle): Promise<string> => {
    const name = dirHandle.name;
    webVirtualFS['/web-projects/' + name + '/'] = ''; // mark root
    await importDirectoryHandle(dirHandle, '/web-projects/' + name);
    return '/web-projects/' + name;
  },

  saveFile: async (path: string, content: string): Promise<void> => {
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

    // Web fallback: persist to virtual in-memory FS (and optionally localStorage for small files)
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
