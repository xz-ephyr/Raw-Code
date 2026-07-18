export interface SubAgentRequest {
  readonly task: string;
  readonly context?: string;
  readonly model?: unknown;
  readonly maxSteps?: number;
  readonly toolScope?: readonly string[];
  readonly agentType?: string;
  readonly parentSessionID: string;
  readonly resolveCredential?: (provider: string) => string | undefined;
}

export interface SubAgentResult {
  readonly output: string;
  readonly toolCalls: number;
  readonly steps: number;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
  readonly toolResults: readonly ToolResult[];
}

export interface ToolResult {
  readonly name: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly error?: string;
}
