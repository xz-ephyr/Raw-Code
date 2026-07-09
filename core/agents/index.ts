import type { Agent } from './types';
import { explorerAgent } from './explorer';
import { debugAgent } from './debug';
import { strategyAuditorAgent } from './strategy-auditor';
import { teamworkAgent } from './teamwork';

export const AGENTS: Agent[] = [
  explorerAgent,
  strategyAuditorAgent,
  debugAgent,
  teamworkAgent,
];

export type { Agent, AgentTool } from './types';

export function getAgentById(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}
