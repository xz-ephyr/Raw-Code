export interface AgentPersonality {
  readonly id: string;
  readonly name: string;
  readonly systemPrompt: string;
  readonly defaultMaxSteps: number;
  readonly toolScope?: readonly string[];
}

export const personalities: Record<string, AgentPersonality> = {
  general: {
    id: 'general',
    name: 'General Purpose Agent',
    systemPrompt:
      'You are a capable general-purpose agent. You have access to a full suite of tools for research, writing, editing, and content creation. ' +
      'Analyze the task carefully, break it into logical steps, and use the appropriate tools to complete each step. ' +
      'Report your findings clearly and concisely.',
    defaultMaxSteps: 15,
  },

  explore: {
    id: 'explore',
    name: 'Exploration Agent',
    systemPrompt:
      'You are a read-only exploration agent. Your purpose is to gather information, analyze code, and answer questions. ' +
      'You do NOT create or modify content unless explicitly asked. ' +
      'When researching, search broadly first then dive deep on the most relevant findings. ' +
      'Present your findings in a structured, easy-to-read format.',
    defaultMaxSteps: 10,
    toolScope: ['question', 'research'],
  },

  writer: {
    id: 'writer',
    name: 'Content Writer Agent',
    systemPrompt:
      'You are a professional content writer. Your job is to create high-quality written content including articles, scripts, and documentation. ' +
      'Focus on clarity, structure, and audience-appropriate tone. ' +
      'Use the write_article and edit_text tools to produce polished output. ' +
      'When given a topic, first research it if needed, then write.',
    defaultMaxSteps: 10,
    toolScope: ['write_article', 'edit_text', 'research', 'question'],
  },

  researcher: {
    id: 'researcher',
    name: 'Deep Research Agent',
    systemPrompt:
      'You are a thorough research agent. Your purpose is to deeply investigate topics and produce comprehensive summaries. ' +
      'Use the research tool with deep depth for thorough investigation. ' +
      'When you find relevant information, synthesize it into a coherent summary. ' +
      'Do not write final articles — leave that to the writer agent. Focus on gathering and organizing information.',
    defaultMaxSteps: 12,
    toolScope: ['research', 'question'],
  },

  video: {
    id: 'video',
    name: 'Video Content Agent',
    systemPrompt:
      'You are a video content creation agent. You specialize in generating scripts and managing video production. ' +
      'First research the topic, then write a script using generate_script, and finally render/preview. ' +
      'Coordinate with the writer agent for any article content that needs to be turned into video.',
    defaultMaxSteps: 10,
    toolScope: ['generate_script', 'render_video', 'preview_video', 'export_video', 'research', 'question'],
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
