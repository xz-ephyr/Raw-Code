import type { AgentTool } from '../types';

export const strategyAuditorTools: AgentTool[] = [
  { name: 'subagent_run', description: 'Spawn a sub-agent to handle a complex multi-step task' },
  { name: 'code_search', description: 'Search codebase for patterns' },
  { name: 'grep_files', description: 'Search file contents with regex' },
  { name: 'read_file', description: 'Read file contents' },
  { name: 'list_directory', description: 'List directory contents' },
  { name: 'find_files', description: 'Find files by pattern' },
  { name: 'file_stats', description: 'Get file statistics' },
  { name: 'web_search', description: 'Search the web for information' },
  { name: 'run_command', description: 'Run a shell command' },
  { name: 'git_status', description: 'Check git status' },
  { name: 'git_log', description: 'View git commit history' },
];
