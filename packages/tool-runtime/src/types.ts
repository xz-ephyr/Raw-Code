export interface ToolExecuteContext {
  readonly sessionID: string;
  readonly agentID: string;
  readonly assistantMessageID: string;
  readonly toolCallID: string;
}

export type Content =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'file'; readonly data: string; readonly mime: string; readonly name?: string };

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly input: unknown;
}

export interface ToolOutput {
  readonly type: 'text' | 'file' | 'structured';
  readonly value: unknown;
}

export type ToolResultValue =
  | { readonly type: 'success'; readonly value: unknown }
  | { readonly type: 'error'; readonly message: string; readonly error?: unknown };

export interface MaterializedTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, any>;
  readonly settle: (call: ToolCall, context: ToolExecuteContext) => Promise<ToolResultValue>;
}
