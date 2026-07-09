import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../core/utils/DatabaseService', () => {
  const store = new Map<string, Array<{ key: string; value: string; source: string; updatedAt: number }>>();

  return {
    DatabaseService: {
      getProjectMemory: vi.fn(async (projectId: string) => {
        return store.get(projectId) ?? [];
      }),
      setProjectMemory: vi.fn(async (projectId: string, key: string, value: string, source: string) => {
        if (!store.has(projectId)) store.set(projectId, []);
        const entries = store.get(projectId)!;
        const existing = entries.find(e => e.key === key);
        if (existing) {
          existing.value = value;
          existing.source = source;
          existing.updatedAt = Date.now();
        } else {
          entries.push({ key, value, source, updatedAt: Date.now() });
        }
      }),
      deleteProjectMemory: vi.fn(async (projectId: string, key: string) => {
        const entries = store.get(projectId);
        if (entries) {
          const idx = entries.findIndex(e => e.key === key);
          if (idx !== -1) entries.splice(idx, 1);
        }
      }),
      clearProjectMemory: vi.fn(async (projectId: string) => {
        store.delete(projectId);
      }),
      __reset: () => store.clear(),
    },
  };
});

import { getProjectMemory, setProjectMemory, deleteProjectMemory, clearProjectMemory } from '../core/memory/projectMemory';
import { DatabaseService } from '../core/utils/DatabaseService';

beforeEach(() => {
  (DatabaseService as any).__reset();
});

describe('Memory Isolation Per Project', () => {
  it('should store memory scoped to a project', async () => {
    await setProjectMemory('proj-a', 'key1', 'value-a');
    const mem = await getProjectMemory('proj-a');
    expect(mem).toHaveLength(1);
    expect(mem[0]).toMatchObject({ key: 'key1', value: 'value-a' });
  });

  it('should NOT leak memory between different projects', async () => {
    await setProjectMemory('proj-a', 'shared-key', 'value-from-a');
    await setProjectMemory('proj-b', 'shared-key', 'value-from-b');

    const memA = await getProjectMemory('proj-a');
    const memB = await getProjectMemory('proj-b');

    expect(memA).toHaveLength(1);
    expect(memA[0].value).toBe('value-from-a');

    expect(memB).toHaveLength(1);
    expect(memB[0].value).toBe('value-from-b');

    expect(memA[0].value).not.toBe(memB[0].value);
  });

  it('should return empty array for projects with no memory', async () => {
    const mem = await getProjectMemory('nonexistent');
    expect(mem).toEqual([]);
  });

  it('should delete a specific memory key within a project', async () => {
    await setProjectMemory('proj-a', 'keep-me', 'stay');
    await setProjectMemory('proj-a', 'delete-me', 'go');

    await deleteProjectMemory('proj-a', 'delete-me');

    const mem = await getProjectMemory('proj-a');
    expect(mem).toHaveLength(1);
    expect(mem[0].key).toBe('keep-me');
  });

  it('should clear ALL memory for a project without affecting others', async () => {
    await setProjectMemory('proj-a', 'k1', 'v1');
    await setProjectMemory('proj-a', 'k2', 'v2');
    await setProjectMemory('proj-b', 'k1', 'v1-b');

    await clearProjectMemory('proj-a');

    const memA = await getProjectMemory('proj-a');
    const memB = await getProjectMemory('proj-b');

    expect(memA).toEqual([]);
    expect(memB).toHaveLength(1);
  });

  it('should allow different keys in the same project', async () => {
    await setProjectMemory('proj-a', 'alpha', '1');
    await setProjectMemory('proj-a', 'beta', '2');
    await setProjectMemory('proj-a', 'gamma', '3');

    const mem = await getProjectMemory('proj-a');
    expect(mem).toHaveLength(3);
  });

  it('should overwrite existing key within same project', async () => {
    await setProjectMemory('proj-a', 'key1', 'original');
    await setProjectMemory('proj-a', 'key1', 'updated');

    const mem = await getProjectMemory('proj-a');
    expect(mem).toHaveLength(1);
    expect(mem[0].value).toBe('updated');
  });
});
