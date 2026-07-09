import { useCallback, useRef } from 'react';
import type { ProjectContext } from '@core/memory/contextController';
import { ChatSessionManager } from '@/services/ChatSessionManager';
import { FileSystemService } from '@core/workspace/FileSystemService';
import { DatabaseService } from '@core/utils/DatabaseService';

const MAX_CACHE_ENTRIES = 5;
const CACHE_TTL = 30000;

export function useProjectContext(uuid: string | undefined) {
  const cacheRef = useRef<Record<string, { context: ProjectContext; timestamp: number }>>({});

  const getProjectContext = useCallback(async (): Promise<ProjectContext | undefined> => {
    if (!uuid || uuid === 'new') return undefined;

    try {
      const session = await ChatSessionManager.getSession(uuid);
      if (!session?.projectId) return undefined;

      const now = Date.now();
      const entries = Object.entries(cacheRef.current);
      const stale = entries.some(([, v]) => now - v.timestamp > CACHE_TTL);
      if (entries.length >= MAX_CACHE_ENTRIES || stale) {
        const sorted = entries
          .filter(([, v]) => now - v.timestamp <= CACHE_TTL)
          .sort((a, b) => b[1].timestamp - a[1].timestamp);
        cacheRef.current = Object.fromEntries(sorted.slice(0, MAX_CACHE_ENTRIES - 1));
      }

      const cached = cacheRef.current[session.projectId];
      if (cached && now - cached.timestamp < CACHE_TTL) {
        return cached.context;
      }

      const projects = await DatabaseService.getProjects();
      const project = projects.find(p => p.id === session.projectId);
      if (!project) return undefined;

      const pc = await FileSystemService.getProjectContent(project.path, project.id);
      const files = pc.tree + '\n\n_Use `read_file`, `search_codebase`, and `list_directory` to explore file contents._';
      const context = { name: project.name, path: project.path, files };

      cacheRef.current[session.projectId] = { context, timestamp: Date.now() };
      return context;
    } catch {
      return undefined;
    }
  }, [uuid]);

  const invalidateCache = useCallback((projectId: string) => {
    delete cacheRef.current[projectId];
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);

  return { getProjectContext, invalidateCache, clearCache };
}
