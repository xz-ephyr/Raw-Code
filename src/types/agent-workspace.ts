export type AgentStatus = 'running' | 'complete' | 'error';

export interface AgentEntry {
  sessionID: string;
  agentID: string;
  parentSessionID?: string;
  task: string;
  status: AgentStatus;
  steps: number;
  toolCalls: number;
  output?: string;
  usage?: { inputTokens: number; outputTokens: number };
  startedAt: number;
  endedAt?: number;
}
