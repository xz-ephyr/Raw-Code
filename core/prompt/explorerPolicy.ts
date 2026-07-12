export const EXPLORER_ALLOWED = ['read', 'grep', 'glob', 'write-to-plan', 'edit-plan', 'write-plan'];
export const EXPLORER_BLOCKED = ['edit', 'write', 'bash', 'delete', 'run'];

export function enforceExplorerPolicy(toolName: string): { allowed: boolean; reason?: string } {
  if (EXPLORER_BLOCKED.includes(toolName)) {
    return { allowed: false, reason: `Explorer agent cannot use "${toolName}". Only read/grep/glob/plan tools are allowed.` };
  }
  if (!EXPLORER_ALLOWED.includes(toolName)) {
    return { allowed: false, reason: `Tool "${toolName}" is not in Explorer agent's allowed toolset.` };
  }
  return { allowed: true };
}


