import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const subagentRunTool: ToolDef = {
  name: 'subagent_run',
  description: 'Spawn a sub-agent to handle a complex multi-step task. Use when: the task needs 3+ sequential tool calls, requires deep research, you are stuck in a loop, or the task can be cleanly isolated. The sub-agent gets its own LLM with full tool access. Do NOT use for simple single-tool operations.',
  category: 'agent',
  inputSchema: z.object({
    task: z.string().describe('The task description for the sub-agent. Be specific: include goals, constraints, expected output format, and any relevant context. The clearer the task, the better the result.'),
    context: z.string().optional().describe('Additional background information, code snippets, or references the sub-agent needs to complete the task.'),
    model: z.string().optional().describe('Optional model ID override for the sub-agent (e.g., "gemini-3.5-flash", "mistral-large-latest"). Defaults to the current model.'),
    maxSteps: z.number().optional().describe('Maximum steps for the sub-agent loop. Default 10. Increase for complex research tasks, decrease for simple delegation.'),
    toolScope: z.array(z.string()).optional().describe('Restrict the sub-agent to specific tools by name (e.g., ["read_file", "grep_files", "web_search"]). If omitted, all tools are available.'),
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
