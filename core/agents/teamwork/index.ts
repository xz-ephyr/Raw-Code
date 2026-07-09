import type { Agent } from '../types';
import { TEAMWORK_AGENT_PROMPT } from './system-prompt';
import { teamworkTools } from './tools';

export const teamworkAgent: Agent = {
  id: 'teamwork',
  label: 'Team Work',
  icon: 'TeamWorkIcon',
  description: 'Collaborate with your team',
  systemPrompt: TEAMWORK_AGENT_PROMPT,
  color: 'amber-500',
  toolScope: teamworkTools.map((t) => t.name),
};
