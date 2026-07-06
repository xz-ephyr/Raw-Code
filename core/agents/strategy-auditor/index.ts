import type { Agent } from '../types';
import { STRATEGY_AUDITOR_PROMPT } from './system-prompt';
import { strategyAuditorTools } from './tools';

export const strategyAuditorAgent: Agent = {
  id: 'strategy-auditor',
  label: 'Plan Buddy',
  icon: 'HandsClappingIcon',
  description: 'Plan, critique, and refine strategies',
  systemPrompt: STRATEGY_AUDITOR_PROMPT,
  color: 'orange-700',
  toolScope: strategyAuditorTools.map((t) => t.name),
};
