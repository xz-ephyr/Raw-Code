import type { AgentTool } from '../types';

export const strategyAuditorTools: AgentTool[] = [
  { name: 'subagent_run', description: 'Spawn a sub-agent to handle a complex multi-step task' },
  { name: 'search_codebase', description: 'Search codebase for files or content patterns' },
  { name: 'read_file', description: 'Read file contents' },
  { name: 'list_directory', description: 'List directory contents' },
  { name: 'web_search', description: 'Search the web for information' },
  { name: 'run_command', description: 'Run a shell command (also use for git: status, log)' },
];
