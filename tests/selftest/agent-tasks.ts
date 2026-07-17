export interface AgentTask {
  id: string
  name: string
  prompt: string
  expected: {
    directResponse?: boolean
    delegatesSubagent?: boolean
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
    name: 'Simple factual question — direct response',
    prompt: 'What is the capital of France?',
    expected: {
      directResponse: true,
      delegatesSubagent: false,
      minLength: 5,
      mustContain: ['Paris'],
      description: 'Responds directly with "Paris" — no subagent needed for a simple fact.',
    },
  },
  {
    id: 'code-gen',
    name: 'Code generation — direct response',
    prompt: 'Write a JavaScript function that checks if a string is a palindrome.',
    expected: {
      directResponse: true,
      delegatesSubagent: false,
      minLength: 80,
      mustContain: ['function', 'return'],
      description: 'Generates code inline; default mode does not delegate code tasks.',
    },
  },
  {
    id: 'research',
    name: 'Research task — delegates to subagent',
    prompt: 'Research the impact of AI on healthcare in 2026.',
    expected: {
      delegatesSubagent: true,
      directResponse: false,
      minLength: 100,
      description: 'Delegates to subagent_run — the prompt requires research beyond the model\'s training cut-off.',
    },
  },
  {
    id: 'writing',
    name: 'Article writing — delegates to subagent',
    prompt: 'Write a 300-word article about renewable energy trends for a tech blog.',
    expected: {
      delegatesSubagent: true,
      directResponse: false,
      minLength: 200,
      description: 'Delegates writing tasks to subagent_run per persona rules.',
    },
  },
  {
    id: 'math',
    name: 'Math calculation — direct response',
    prompt: 'If a train travels at 120 km/h for 2.5 hours, how far does it go?',
    expected: {
      directResponse: true,
      delegatesSubagent: false,
      minLength: 10,
      mustContain: ['300'],
      mustNotContain: ['subagent', 'delegate'],
      description: 'Performs calculation directly — no need for subagent.',
    },
  },
  {
    id: 'ambiguous',
    name: 'Ambiguous query — asks clarifying question',
    prompt: 'Make it better',
    expected: {
      directResponse: true,
      delegatesSubagent: false,
      minLength: 10,
      description: 'Without prior context, the agent should ask for clarification rather than assuming.',
    },
  },
  {
    id: 'definition',
    name: 'Technical definition — direct response',
    prompt: 'Explain what dependency injection is in software engineering.',
    expected: {
      directResponse: true,
      delegatesSubagent: false,
      minLength: 80,
      mustContain: ['pattern'],
      description: 'Answers from built-in knowledge — no delegation needed.',
    },
  },
  {
    id: 'tool-refusal',
    name: 'Tool call request — delegates or explains, never calls tool directly',
    prompt: 'Use the web_search tool to look up the weather in Tokyo today.',
    expected: {
      delegatesSubagent: true,
      directResponse: false,
      minLength: 20,
      description: 'Default mode persona says "Do NOT call tools like web_search yourself — let the general sub-agent handle them." Should delegate to subagent_run.',
    },
  },
  {
    id: 'creative',
    name: 'Creative writing — direct response',
    prompt: 'Write a short poem about version control.',
    expected: {
      directResponse: true,
      delegatesSubagent: false,
      minLength: 50,
      mustNotContain: ['subagent', 'delegate'],
      description: 'Creative tasks are handled directly without delegation.',
    },
  },
  {
    id: 'reasoning',
    name: 'Multi-step reasoning — direct scientific explanation',
    prompt: 'What would happen if the Earth suddenly stopped spinning? Explain the consequences in detail.',
    expected: {
      directResponse: true,
      delegatesSubagent: false,
      minLength: 150,
      description: 'Scientific explanation is handled from built-in knowledge.',
    },
  },
]
