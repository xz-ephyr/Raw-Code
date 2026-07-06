import type { FileNode, SearchMatch, ProjectFileEntry } from './types';
import { saveIdeFiles } from '@/services/IdeApi';

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultFiles(): FileNode {
  return {
    id: generateId(),
    name: 'ide-files',
    path: '/ide-files',
    content: '',
    language: '',
    isFolder: true,
    expanded: true,
    children: [
      {
        id: generateId(),
        name: 'index.html',
        path: '/ide-files/index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello World</h1>
  <script src="app.js"></script>
</body>
</html>`,
        language: 'html',
        isFolder: false,
        children: [],
        expanded: false,
      },
      {
        id: generateId(),
        name: 'style.css',
        path: '/ide-files/style.css',
        content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  padding: 2rem;
}`,
        language: 'css',
        isFolder: false,
        children: [],
        expanded: false,
      },
      {
        id: generateId(),
        name: 'app.js',
        path: '/ide-files/app.js',
        content: `console.log('Hello from Raw Code IDE');

document.addEventListener('DOMContentLoaded', () => {
  const heading = document.querySelector('h1');
  if (heading) {
    heading.textContent = 'Welcome to the IDE';
  }
});`,
        language: 'javascript',
        isFolder: false,
        children: [],
        expanded: false,
      },
    ],
  };
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export class VirtualFileSystem {
  private root: FileNode;

  constructor(root?: FileNode) {
    this.root = root ?? createDefaultFiles();
  }

  setRoot(root: FileNode): void {
    this.root = root;
  }

  private persist(): void {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      const tree = this.root;
      saveIdeFiles(tree).catch(() => {});
    }, 300);
  }

  getRoot(): FileNode {
    return this.root;
  }

  getNode(path: string): FileNode | null {
    const parts = path.replace(/^\/+/, '').split('/');
    let current: FileNode = this.root;
    for (let i = 1; i < parts.length; i++) {
      const child = current.children.find(c => c.name === parts[i]);
      if (!child) return null;
      current = child;
    }
    return current;
  }

  getParentPath(path: string): string {
    const normalized = path.replace(/\/+$/, '');
    const lastSlash = normalized.lastIndexOf('/');
    return lastSlash <= 0 ? '/' : normalized.slice(0, lastSlash);
  }

  getFileName(path: string): string {
    const normalized = path.replace(/\/+$/, '');
    return normalized.slice(normalized.lastIndexOf('/') + 1);
  }

  createFile(path: string, content: string = ''): FileNode {
    const parentPath = this.getParentPath(path);
    const name = this.getFileName(path);
    const parent = this.getNode(parentPath);
    if (!parent) throw new Error(`Parent path not found: ${parentPath}`);

    const existing = parent.children.find(c => c.name === name);
    if (existing) throw new Error(`File already exists: ${path}`);

    const node: FileNode = {
      id: generateId(),
      name,
      path,
      content,
      language: this.getLanguage(name),
      isFolder: false,
      children: [],
      expanded: false,
    };
    parent.children.push(node);
    this.persist();
    return node;
  }

  createFolder(path: string): FileNode {
    const parentPath = this.getParentPath(path);
    const name = this.getFileName(path);
    const parent = this.getNode(parentPath);
    if (!parent) throw new Error(`Parent path not found: ${parentPath}`);

    const node: FileNode = {
      id: generateId(),
      name,
      path,
      content: '',
      language: '',
      isFolder: true,
      children: [],
      expanded: false,
    };
    parent.children.push(node);
    this.persist();
    return node;
  }

  delete(path: string): void {
    const parentPath = this.getParentPath(path);
    const name = this.getFileName(path);
    const parent = this.getNode(parentPath);
    if (!parent) return;

    const idx = parent.children.findIndex(c => c.name === name);
    if (idx !== -1) {
      parent.children.splice(idx, 1);
      this.persist();
    }
  }

  rename(oldPath: string, newName: string): void {
    const node = this.getNode(oldPath);
    if (!node) throw new Error(`Path not found: ${oldPath}`);

    const parentPath = this.getParentPath(oldPath);
    const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;

    const parent = this.getNode(parentPath);
    if (parent) {
      const existing = parent.children.find(c => c.name === newName && c.id !== node.id);
      if (existing) throw new Error(`Name already exists: ${newName}`);
    }

    node.name = newName;
    node.path = newPath;
    node.language = node.isFolder ? '' : this.getLanguage(newName);

    // update paths of all descendants
    if (node.isFolder) {
      const updatePaths = (n: FileNode) => {
        for (const child of n.children) {
          child.path = child.path.replace(
            new RegExp(`^${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
            newPath
          );
          if (child.isFolder) updatePaths(child);
        }
      };
      updatePaths(node);
    }

    this.persist();
  }

  saveFile(path: string, content: string): void {
    const node = this.getNode(path);
    if (!node || node.isFolder) throw new Error(`File not found: ${path}`);
    node.content = content;
    this.persist();
  }

  loadFromProject(name: string, files: ProjectFileEntry[]): void {
    const root: FileNode = {
      id: generateId(),
      name,
      path: `/${name}`,
      content: '',
      language: '',
      isFolder: true,
      expanded: true,
      children: [],
    };

    for (const file of files) {
      const parts = file.path.replace(/^\/+/, '').split('/');
      let current = root;
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        if (!isLast) {
          let child = current.children.find(c => c.name === part && c.isFolder);
          if (!child) {
            const folderPath = '/' + parts.slice(1, i + 1).join('/');
            child = {
              id: generateId(),
              name: part,
              path: folderPath,
              content: '',
              language: '',
              isFolder: true,
              expanded: true,
              children: [],
            };
            current.children.push(child);
          }
          current = child;
        } else {
          const filePath = '/' + parts.slice(1, i + 1).join('/');
          current.children.push({
            id: generateId(),
            name: part,
            path: filePath,
            content: file.content,
            language: this.getLanguage(part),
            isFolder: false,
            children: [],
            expanded: false,
          });
        }
      }
    }

    this.root = root;
    this.persist();
  }

  search(query: string): SearchMatch[] {
    const results: SearchMatch[] = [];
    const allFiles = this.getAllFiles().filter(f => !f.isFolder);
    const lowerQuery = query.toLowerCase();

    for (const file of allFiles) {
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const col = lines[i].toLowerCase().indexOf(lowerQuery);
        if (col !== -1) {
          results.push({
            path: file.path,
            line: i + 1,
            column: col + 1,
            text: lines[i].trim(),
          });
        }
      }
    }

    return results;
  }

  getLanguage(fileName: string): string {
    const ext = fileName.slice(fileName.lastIndexOf('.'));
    const map: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.html': 'html',
      '.css': 'css',
      '.json': 'json',
      '.md': 'markdown',
      '.py': 'python',
      '.rs': 'rust',
      '.go': 'go',
    };
    return map[ext] || 'plaintext';
  }

  getAllFiles(): FileNode[] {
    const result: FileNode[] = [];
    const walk = (node: FileNode) => {
      result.push(node);
      for (const child of node.children) {
        walk(child);
      }
    };
    walk(this.root);
    return result;
  }
}
