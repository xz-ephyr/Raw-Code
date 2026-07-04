import { z } from 'zod';

export type ToolCategory = 'web' | 'code' | 'git' | 'system' | 'network';

export interface ToolDef<TInput = any, TOutput = any> {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: z.ZodType<TInput>;
  execute: (input: TInput) => Promise<TOutput>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}
