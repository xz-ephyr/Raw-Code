export interface AgentTask {
  id: string
  name: string
  prompt: string
  expected: {
    callsSubagent?: boolean
    minLength?: number
    maxLength?: number
    mustContain?: string[]
    mustNotContain?: string[]
    mustMatchPattern?: RegExp
    description: string
  }
}

export const DEFAULT_AGENT_TASKS: AgentTask[] = [
  {
    id: 'simple-qa',
    name: 'Simple factual question — direct answer',
    prompt: 'What is the capital of France?',
    expected: {
      callsSubagent: false,
      minLength: 5,
      mustContain: ['Paris'],
      description: 'Answers directly from built-in knowledge. No tools or subagent needed.',
    },
  },
  {
    id: 'code-gen',
    name: 'Code generation — direct with inline code',
    prompt: 'Write a JavaScript function that checks if a string is a palindrome.',
    expected: {
      callsSubagent: false,
      minLength: 80,
      mustContain: ['function', 'return'],
      description: 'Generates code inline without delegating.',
    },
  },
  {
    id: 'web-search',
    name: 'Web search — direct tool call (not subagent)',
    prompt: 'Search the web for the latest AI developments in 2026.',
    expected: {
      callsSubagent: false,
      minLength: 100,
      description: 'Calls web_search or research tool directly — no subagent needed for a single search.',
    },
  },
  {
    id: 'research-write',
    name: 'Research + writing — direct tool use',
    prompt: 'Research the impact of AI on healthcare and write a 200-word summary.',
    expected: {
      callsSubagent: false,
      minLength: 200,
      description: 'Calls research/write_article tools directly for a single topic.',
    },
  },
  {
    id: 'math',
    name: 'Math calculation — direct answer',
    prompt: 'If a train travels at 120 km/h for 2.5 hours, how far does it go?',
    expected: {
      callsSubagent: false,
      minLength: 10,
      mustContain: ['300'],
      mustNotContain: ['subagent', 'delegate'],
      description: 'Answers from built-in knowledge — no tools needed.',
    },
  },
  {
    id: 'ambiguous',
    name: 'Ambiguous query — asks clarifying question',
    prompt: 'Make it better',
    expected: {
      callsSubagent: false,
      minLength: 10,
      description: 'Without prior context, the agent should ask for clarification rather than assuming.',
    },
  },
  {
    id: 'definition',
    name: 'Technical definition — direct answer',
    prompt: 'Explain what dependency injection is in software engineering.',
    expected: {
      callsSubagent: false,
      minLength: 80,
      mustContain: ['pattern'],
      description: 'Answers from built-in knowledge without delegation.',
    },
  },
  {
    id: 'tool-direct',
    name: 'Tool invocation — calls web_search directly',
    prompt: 'Use the web_search tool to look up the weather in Tokyo today.',
    expected: {
      callsSubagent: false,
      minLength: 20,
      description: 'New persona allows direct tool calls. Should call web_search directly, not delegate.',
    },
  },
  {
    id: 'creative',
    name: 'Creative writing — direct answer',
    prompt: 'Write a short poem about version control.',
    expected: {
      callsSubagent: false,
      minLength: 50,
      mustNotContain: ['subagent', 'delegate'],
      description: 'Creative tasks handled directly without delegation.',
    },
  },
  {
    id: 'reasoning',
    name: 'Multi-step reasoning — direct explanation',
    prompt: 'What would happen if the Earth suddenly stopped spinning? Explain the consequences in detail.',
    expected: {
      callsSubagent: false,
      minLength: 150,
      description: 'Scientific explanation from built-in knowledge — no tools or subagent needed.',
    },
  },
]
