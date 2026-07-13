export interface SubAgentRequest {
  readonly task: string;
  readonly context?: string;
  readonly model?: string;
  readonly maxSteps?: number;
  readonly toolScope?: readonly string[];
  readonly agentType?: string;
  readonly parentSessionID: string;
}

export interface SubAgentResult {
  readonly output: string;
  readonly toolCalls: number;
  readonly steps: number;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
}
