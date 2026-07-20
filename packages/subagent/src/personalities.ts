export interface AgentPersonality {
  readonly id: string;
  readonly name: string;
  readonly systemPrompt: string;
  readonly defaultMaxSteps: number;
  readonly toolScope?: readonly string[];
}

export const personalities: Record<string, AgentPersonality> = {
  default: {
    id: 'default',
    name: 'Default Agent',
    systemPrompt:
      'You are a capable agent with direct tool access. ' +
      'Handle simple tasks directly — search the web, scrape pages, crawl sites, ask the user questions, ' +
      'manage video production (edit_video, render_video, export_video, preview_video, poll_render_job), ' +
      'create and execute plans (create_plan, execute_plan), and use connector tools. ' +
      'For large-scale multi-step work that requires gathering lots of information from many sources ' +
      'and synthesizing into multiple deliverables, use subagent_run or compose_run to delegate. ' +
      'Respond directly when you know the answer without needing tools.',
    defaultMaxSteps: 20,
    toolScope: [
      'web_search', 'scrape_url', 'crawl_website', 'question',
      'edit_video', 'render_video', 'export_video', 'preview_video', 'poll_render_job',
      'create_plan', 'execute_plan',
      'subagent_run', 'compose_run',
    ],
  },

  teamwork: {
    id: 'teamwork',
    name: 'Teamwork Coordinator',
    systemPrompt:
      'You are a Teamwork Orchestrator — coordinating multiple specialized agents to solve complex problems collaboratively. ' +
      'Break down complex tasks into smaller sub-tasks. ' +
      'Route sub-tasks to appropriate agents using subagent_run (supports parallel execution via "tasks" array). ' +
      'Use compose_run for multi-step pipelines where each step depends on the previous one. ' +
      'Synthesize results from multiple agents into a coherent response.',
    defaultMaxSteps: 15,
    toolScope: ['subagent_run'],
  },
};

export function getPersonality(id?: string): AgentPersonality | undefined {
  if (!id) return undefined;
  return personalities[id];
}

export function buildSystemPrompt(request: { task: string; context?: string; agentType?: string }): string {
  const personality = request.agentType ? getPersonality(request.agentType) : undefined;
  const basePrompt = personality?.systemPrompt ??
    'You are a focused sub-agent. Complete the assigned task using the tools available to you. Be concise. Report findings, not internal reasoning.';

  const parts: string[] = [basePrompt];

  if (request.context) {
    parts.push(`\n## Context\n${request.context}`);
  }

  return parts.join('\n\n');
}

export function getToolScope(agentType?: string, explicitScope?: readonly string[]): readonly string[] | undefined {
  if (explicitScope) return explicitScope;
  const personality = agentType ? getPersonality(agentType) : undefined;
  return personality?.toolScope;
}

export function getMaxSteps(agentType?: string, explicitMaxSteps?: number): number {
  if (explicitMaxSteps !== undefined) return explicitMaxSteps;
  const personality = agentType ? getPersonality(agentType) : undefined;
  return personality?.defaultMaxSteps ?? 10;
}
