export type SessionContext = 'new_task' | 'continuing_session';

interface ToolPolicy {
  ratios: Record<string, number>;
  phases: ToolPhase[];
  rules: string[];
}

interface ToolPhase {
  name: string;
  tools: string[];
  description: string;
}

const NEW_TASK_POLICY: ToolPolicy = {
  ratios: {
    grep: 45,
    glob: 45,
    read_file: 20,
    edit_file: 15,
    write_file: 15,
    list_directory: 10,
    run_command: 10,
  },
  phases: [
    {
      name: 'Explore',
      tools: ['search_codebase', 'list_directory'],
      description: 'Use grep/glob 45% most of the time to find exact patterns of where to read. list_directory only 10% when the project structure is truly unknown and grep/glob cannot narrow it down.',
    },
    {
      name: 'Read',
      tools: ['read_file'],
      description: 'Read only 20% after grep/glob pinpoint the exact file and location.',
    },
    {
      name: 'Act',
      tools: ['edit_file', 'write_file'],
      description: 'Edit 15% only after grep/glob/read identify what should change. Write 15% after pinpoints where new code goes.',
    },
    {
      name: 'Verify',
      tools: ['run_command'],
      description: 'Run bash/commands 10% if needed to verify, test, lint, or build.',
    },
  ],
  rules: [
    'In a new task, spend most tool calls in Explore phase (grep/glob) before touching any file — find the exact patterns first.',
    'Prefer search_codebase (with query or pattern) over list_directory. list_directory is a fallback at 10% only when the project is in super condition that requires listing.',
    'read_file only after grep/glob narrows down the exact file and location — no blind reads.',
    'Never edit_file or write_file in the first 50% of tool calls on a new task.',
    'If 3 consecutive grep/glob calls return no results, switch approach: try a broader pattern then list_directory.',
    'run_command 10% if needed for verification, never for exploration.',
  ],
};

const CONTINUING_SESSION_POLICY: ToolPolicy = {
  ratios: {
    grep: 45,
    glob: 45,
    read_file: 20,
    edit_file: 15,
    write_file: 15,
    run_command: 10,
  },
  phases: [
    {
      name: 'Orient',
      tools: ['search_codebase', 'read_file'],
      description: 'Quickly re-read files you worked on earlier — they may have changed. Use grep/glob to navigate to exact locations.',
    },
    {
      name: 'Act',
      tools: ['edit_file', 'write_file'],
      description: 'Make targeted changes. You already know the codebase — write 15% after grep/glob/read pinpoints the exact place, edit 15% after identifying what should change.',
    },
    {
      name: 'Verify',
      tools: ['run_command'],
      description: 'Run bash/commands 10% if needed to verify changes.',
    },
  ],
  rules: [
    'You already explored this codebase. Use grep/glob 45% most of the time to find patterns of where to read.',
    'Always read_file before edit_file — even if you wrote the file earlier this session.',
    'Use search_codebase to find recent changes or confirm file locations, not to re-explore.',
    'list_directory is almost never needed in a continuing session.',
    'run_command 10% if needed for verification, never for exploration.',
  ],
};

export function buildToolPolicy(context: SessionContext): string {
  const policy = context === 'new_task' ? NEW_TASK_POLICY : CONTINUING_SESSION_POLICY;
  const ratioLines = Object.entries(policy.ratios)
    .filter(([, v]) => v > 0)
    .map(([tool, pct]) => `  - ${tool}: ~${pct}%`);
  const phaseLines = policy.phases.map(p =>
    `  ${p.name}: ${p.description}\n    Tools: ${p.tools.join(', ')}`
  );
  return [
    '### TOOL USAGE POLICY',
    '',
    '**Recommended tool ratios:**',
    ...ratioLines,
    '',
    '**Phases (in order):**',
    ...phaseLines,
    '',
    '**Rules:**',
    ...policy.rules.map(r => `  - ${r}`),
    '',
    '### EXPLORER AGENT (project mode only)',
    '',
    'For complex, multi-file tasks in an unfamiliar project:',
    '  - Call subagent_run with: agentType: "explorer", task: "<what needs exploring>"',
    '  - The explorer is READ-ONLY (no edit/write/run)',
    '  - Set maxSteps to 15-20 for thorough exploration',
    '  - After it returns, use its summary to make targeted changes',
    '',
    'Example:',
    '  subagent_run({',
    '    agentType: "explorer",',
    '    task: "Explore the auth system. Find: 1) login/register routes, 2) session management, 3) token refresh flow. I need to add OAuth support.",',
    '    maxSteps: 15',
    '  })',
  ].join('\n');
}
