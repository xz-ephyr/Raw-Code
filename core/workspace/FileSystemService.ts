import { DatabaseService } from '@core/utils/DatabaseService';
import { isTauri } from '@core/utils/platform';
import { TreeBuilders } from './treeBuilder';
import { getVirtualFS, setVirtualFile } from './virtualFs';
import { serializeTree, readProjectFiles, readDirectoryHandle, isLikelyBinary } from './fileUtils';

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

interface FileContent {
  path: string;
  size: number;
  text: string;
}

interface ProjectContent {
  tree: string;
  contents: FileContent[];
  truncated: boolean;
  skippedBinary: number;
  skippedSize: number;
}

const treeCache = new Map<string, { result: FileEntry[]; timestamp: number }>();
const TREE_CACHE_TTL = 2_000;

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

export const FileSystemService = {
  getTree: async (basePath: string, depth = 0, projectId?: string): Promise<FileEntry[]> => {
    if (depth > 20) return [];

    const cached = getCachedTree(basePath);
    if (cached) return cached;

    try {
      let result: FileEntry[];
      if (isTauri()) {
        result = await TreeBuilders.tauri(basePath, depth, projectId);
      } else if (projectId) {
        result = await TreeBuilders.fromDatabase(basePath, projectId);
      } else {
        result = await TreeBuilders.fromVirtualFS(basePath, getVirtualFS());
      }

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

  getFileContent: async (path: string, projectId?: string): Promise<string> => {
    if (isTauri()) {
      try {
        const { readFile } = await import('@tauri-apps/plugin-fs');
        const uint8Array = await readFile(path);
        return new TextDecoder().decode(uint8Array);
      } catch (e) {
        console.error('Error reading file:', e);
        return '';
      }
    }

    if (projectId) {
      try {
        return await DatabaseService.getProjectFileContent(projectId, path);
      } catch (e) {
        console.error('Error reading file from server:', e);
        return '';
      }
    }

    return getVirtualFS()[path] ?? '';
  },

  isLikelyBinary: isLikelyBinary,

  getProjectContent: async (basePath: string, projectId?: string): Promise<ProjectContent> => {
    const MAX_TOTAL_CHARS = 60_000;
    const MAX_FILE_CHARS = 30_000;
    const tree = await FileSystemService.getTree(basePath, 0, projectId);

    const treeText = serializeTree(tree);
    const result = await readProjectFiles(tree, projectId, MAX_TOTAL_CHARS, MAX_FILE_CHARS, FileSystemService.getFileContent);

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
    const projectPath = name;

    const files = await readDirectoryHandle(dirHandle, projectPath);

    getVirtualFS()[projectPath + '/'] = '';
    for (const f of files) {
      setVirtualFile(f.path, f.content);
    }

    if (projectId) {
      try {
        await DatabaseService.saveProjectFiles(projectId, files.map(f => ({ path: f.path, content: f.content })));
      } catch (e) {
        console.error('Error uploading files to server:', e);
      }
    }

    return projectPath;
  },

  saveFile: async (path: string, content: string, projectId?: string): Promise<void> => {
    clearTreeCache();
    if (isTauri()) {
      try {
        const { writeFile, mkdir } = await import('@tauri-apps/plugin-fs');
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

    if (projectId) {
      try {
        await DatabaseService.saveProjectFiles(projectId, [{ path, content }]);
        return;
      } catch (e) {
        console.error('Error saving file to server:', e);
      }
    }

    setVirtualFile(path, content);
  },
};
