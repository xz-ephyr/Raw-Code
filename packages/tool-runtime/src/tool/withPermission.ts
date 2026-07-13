import { getRuntime } from './settle';
import type { AnyTool } from './make';

export interface PermissionRule {
  readonly action: string;
  readonly resource: string;
  readonly effect: 'allow' | 'deny';
}

export type PermissionRuleset = readonly PermissionRule[];

export function withPermission<T extends AnyTool>(
  tool: T,
  rules: PermissionRule[],
): T {
  const runtime = getRuntime(tool);
  if (runtime) {
    (runtime as unknown as Record<string, unknown>).permission = rules;
  }
  return tool;
}

export function checkPermission(
  _toolName: string,
  action: string,
  resource: string,
  ruleset: PermissionRuleset,
): boolean {
  for (const rule of ruleset) {
    if (rule.action === action && resourceMatches(rule.resource, resource)) {
      if (rule.effect === 'deny') return false;
    }
  }
  return true;
}

function resourceMatches(pattern: string, resource: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('*')) {
    return resource.startsWith(pattern.slice(0, -1));
  }
  return pattern === resource;
}
