import type { Agent } from '../types';
import { DEBUG_AGENT_PROMPT } from './system-prompt';
import { debugTools } from './tools';

export const debugAgent: Agent = {
  id: 'debug',
  label: 'Bug Buster',
  icon: 'Bug02Icon',
  description: 'Identify and fix issues',
  systemPrompt: DEBUG_AGENT_PROMPT,
  color: 'purple-700',
  toolScope: debugTools.map((t) => t.name),
};
