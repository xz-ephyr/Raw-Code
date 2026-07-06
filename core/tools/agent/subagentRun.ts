import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const subagentRunTool: ToolDef = {
  name: 'subagent_run',
  description: 'Spawn a sub-agent to handle a complex multi-step task. The sub-agent gets its own LLM tool-calling loop and can execute multiple tool calls autonomously. Use this for tasks that require multiple steps, research, or code changes that a single tool call cannot handle.',
  category: 'agent',
  inputSchema: z.object({
    task: z.string().describe('The task description for the sub-agent'),
    context: z.string().optional().describe('Optional context or background information'),
    model: z.string().optional().describe('Optional model override for the sub-agent'),
    maxSteps: z.number().optional().describe('Maximum steps for the sub-agent loop (default 10)'),
    toolScope: z.array(z.string()).optional().describe('Optional list of tool names to restrict the sub-agent to'),
  }),
  execute: async ({ task, context, model, maxSteps, toolScope }) => {
    return callGoTool('subagent_run', {
      task,
      context,
      model,
      maxSteps,
      toolScope,
    }, { timeout: 120000 });
  },
};
