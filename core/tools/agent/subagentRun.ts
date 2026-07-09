import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { callGoTool } from '@core/utils/goProxy';

export const subagentRunTool = {
  name: 'subagent_run',
  ...tool({
    description: 'Spawn one or more sub-agents to handle complex multi-step tasks. Each sub-agent gets its own LLM with full tool access. Do NOT use for simple single-tool operations.\n\nTwo modes:\n1. Single task: set `task` to one task description. Spawns one sub-agent.\n2. Parallel tasks: set `tasks` to an array of task descriptions. Spawns one sub-agent per description in parallel and synthesises results.',
    inputSchema: zodSchema(z.object({
      task: z.string().optional().describe('Single task description. Provide goals, constraints, expected output, and context.'),
      tasks: z.array(z.string()).optional().describe('Array of task descriptions for parallel execution. Each spawns a sub-agent; results are synthesised.'),
      context: z.string().optional().describe('Additional background information, code snippets, or references the sub-agent(s) need.'),
      model: z.string().optional().describe('Optional model ID override for the sub-agent(s) (e.g. "z-ai/glm-4.7-flash-free", "deepseek/deepseek-v3.2"). Defaults to the current model.'),
      maxSteps: z.number().optional().describe('Maximum steps per sub-agent loop. Default 10. Increase for complex research, decrease for simple delegation.'),
      agentType: z.string().optional().describe('Optional agent type override (e.g. "explorer"). If set, the sub-agent uses the specified agent\'s system prompt and tool scope.'),
      toolScope: z.array(z.string()).optional().describe('Restrict the sub-agent to specific tools (e.g. ["read_file", "search_codebase", "web_search"]). If omitted, the agent type default scope is used.'),
    })),
    execute: async ({ task, tasks, context, model, maxSteps, agentType, toolScope }) => {
      return callGoTool('subagent_run', {
        task,
        tasks,
        context,
        model,
        maxSteps,
        agentType,
        toolScope,
      }, { timeout: 120000 });
    },
  }),
};
