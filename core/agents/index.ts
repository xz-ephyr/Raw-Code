import type { Agent } from './types';
import { explorerAgent } from './explorer';
import { debugAgent } from './debug';
import { teamworkAgent } from './teamwork';

export const AGENTS: Agent[] = [
  explorerAgent,
  debugAgent,
  teamworkAgent,
];

export type { Agent } from './types';

export function getAgentById(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}
