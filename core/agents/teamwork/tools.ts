import type { AgentTool } from '../types';

export const teamworkTools: AgentTool[] = [
  { name: 'subagent_run', description: 'Spawn a sub-agent to handle a complex multi-step task' },
  { name: 'read_file', description: 'Read file contents' },
  { name: 'code_search', description: 'Search codebase for patterns' },
  { name: 'grep_files', description: 'Search file contents with regex' },
  { name: 'find_files', description: 'Find files by pattern' },
  { name: 'web_search', description: 'Search the web for information' },
  { name: 'write_file', description: 'Write content to a file' },
  { name: 'edit_file', description: 'Edit an existing file' },
];
