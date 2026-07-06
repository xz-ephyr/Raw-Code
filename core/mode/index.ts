import { AGENTS, getAgentById } from '../agents';

export const MODES = AGENTS;

export type { Mode, ModeSkill } from './types';

export function getModeById(id: string) {
  return MODES.find((m) => m.id === id);
}

export function getModeSystemPrompt(id?: string): string {
  if (!id) return '';
  const agent = getAgentById(id);
  return agent?.systemPrompt ?? '';
}
