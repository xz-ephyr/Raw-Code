import type { AgentTool } from '../types';

export const teamworkTools: AgentTool[] = [
  { name: 'subagent_run', description: 'Spawn a sub-agent to handle a complex multi-step task' },
  { name: 'read_file', description: 'Read file contents' },
  { name: 'search_codebase', description: 'Search codebase for files or content patterns' },
  { name: 'web_search', description: 'Search the web for information' },
  { name: 'write_file', description: 'Write content to a file' },
  { name: 'edit_file', description: 'Edit an existing file' },
];
