const webVirtualFS: Record<string, string> = {};

export function getVirtualFS(): Record<string, string> {
  return webVirtualFS;
}

export function initVirtualFS() {
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

export function setVirtualFile(path: string, content: string) {
  webVirtualFS[path] = content;
  try {
    const storageKey = `vfs:${path}`;
    if (content.length < 500_000) {
      localStorage.setItem(storageKey, content);
    }
  } catch {
    /* localStorage quota exceeded */
  }
}

initVirtualFS();
