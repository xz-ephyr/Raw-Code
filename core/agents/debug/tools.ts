import type { AgentTool } from '../types';

export const debugTools: AgentTool[] = [
  { name: 'subagent_run', description: 'Spawn a sub-agent to handle a complex multi-step task' },
  { name: 'run_command', description: 'Run a shell command' },
  { name: 'read_file', description: 'Read file contents' },
  { name: 'search_codebase', description: 'Search codebase for files or content patterns' },
  { name: 'web_search', description: 'Search the web for information' },
];
