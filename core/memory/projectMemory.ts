import { DatabaseService } from '../utils/DatabaseService';

export interface ProjectMemoryEntry {
  key: string;
  value: string;
  source: string;
  updatedAt: number;
}

export async function getProjectMemory(projectId: string): Promise<ProjectMemoryEntry[]> {
  return DatabaseService.getProjectMemory(projectId);
}

export async function setProjectMemory(projectId: string, key: string, value: string, source: string = 'manual'): Promise<void> {
  await DatabaseService.setProjectMemory(projectId, key, value, source);
}

export async function deleteProjectMemory(projectId: string, key: string): Promise<void> {
  await DatabaseService.deleteProjectMemory(projectId, key);
}

export async function clearProjectMemory(projectId: string): Promise<void> {
  await DatabaseService.clearProjectMemory(projectId);
}

interface DiscoveredFact {
  key: string;
  value: string;
}

function tryParseJSON(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function extractFactsFromResult(toolName: string, input: unknown, output: unknown): DiscoveredFact[] {
  const facts: DiscoveredFact[] = [];

  if (toolName !== 'read_file') return facts;

  const inputObj = input as Record<string, unknown> | undefined;
  const outputObj = output as Record<string, unknown> | undefined;
  const path = typeof inputObj?.path === 'string' ? inputObj.path : '';
  const content = typeof outputObj?.content === 'string' ? outputObj.content : '';

  if (!path || !content) return facts;

  // Detect package.json — extract build/lint/test/typecheck scripts
  if (path.endsWith('package.json')) {
    const pkg = tryParseJSON(content);
    if (pkg) {
      const scripts = pkg.scripts as Record<string, string> | undefined;
      if (scripts) {
        const scriptKeys: Record<string, string> = {
          'test-command': 'test',
          'lint-command': 'lint',
          'build-command': 'build',
          'typecheck-command': 'typecheck',
        };
        for (const [factKey, scriptName] of Object.entries(scriptKeys)) {
          if (scripts[scriptName]) {
            facts.push({ key: factKey, value: scripts[scriptName] });
          }
        }
      }
    }
  }

  // Detect go.mod — extract module name
  if (path.endsWith('go.mod')) {
    const firstLine = content.split('\n')[0]?.trim() || '';
    const match = firstLine.match(/^module\s+(\S+)/);
    if (match) {
      facts.push({ key: 'go-module', value: match[1] });
    }
  }

  return facts;
}


