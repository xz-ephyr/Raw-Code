import type { AgentTool } from '../types';

export const debugTools: AgentTool[] = [
  { name: 'subagent_run', description: 'Spawn a sub-agent to handle a complex multi-step task' },
  { name: 'run_command', description: 'Run a shell command' },
  { name: 'read_file', description: 'Read file contents' },
  { name: 'grep_files', description: 'Search file contents with regex' },
  { name: 'code_search', description: 'Search codebase for patterns' },
  { name: 'git_log', description: 'View git commit history' },
  { name: 'git_diff', description: 'View git diff' },
  { name: 'git_status', description: 'Check git status' },
  { name: 'web_search', description: 'Search the web for information' },
  { name: 'find_files', description: 'Find files by pattern' },
];
