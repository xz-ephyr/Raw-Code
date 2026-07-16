import { Effect } from 'effect';
import { streamText, stepCountIs, type LanguageModel } from 'ai';
import type { SubAgentRequest, SubAgentResult } from './types';
import type { Materialization } from '@doktor/tool-runtime';
import { toAISDKTools, emit } from '@doktor/tool-runtime';
import { buildSystemPrompt, getToolScope, getMaxSteps } from './personalities';

export function runSubAgent(
  request: SubAgentRequest,
  materialization: Materialization,
  abortSignal?: AbortSignal,
): Effect.Effect<SubAgentResult, Error> {
  return Effect.tryPromise(async () => {
    const subAgentSessionID = `sub_${crypto.randomUUID()}`;
    const agentID = request.agentType ?? 'general';

    emit({
      type: 'subagent_start',
      sessionID: subAgentSessionID,
      agentID,
      timestamp: Date.now(),
      payload: {
        parentSessionID: request.parentSessionID,
        task: request.task,
      },
    });

    // Determine tool scope and max steps from personality
    const scope = getToolScope(request.agentType, request.toolScope);
    const maxSteps = getMaxSteps(request.agentType, request.maxSteps);

    // Filter tools based on scope
    let filteredMat = materialization;
    if (scope) {
      const filteredDefs = materialization.definitions.filter((d) => scope.includes(d.name));
      const filteredDefsMap = new Map(filteredDefs.map((d) => [d.name, d]));
      filteredMat = {
        definitions: filteredDefs,
        definitionsMap: filteredDefsMap,
        settle: materialization.settle,
      };
    }

    // Pass the subagent's session context down to tools during settlement
    const tools = toAISDKTools(filteredMat, undefined, {
      sessionID: subAgentSessionID,
      agentID,
      assistantMessageID: `msg_${crypto.randomUUID()}`,
    });

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let stepCount = 0;
    let toolCallCount = 0;

    if (typeof request.model !== 'object' || request.model === null) {
      throw new Error(`[subagent] No valid model provided for agent "${agentID}"`);
    }
    const resolvedModel = request.model as LanguageModel;

    const result = await streamText({
      model: resolvedModel,
      system: buildSystemPrompt(request),
      messages: [
        ...(request.context ? [{ role: 'system' as const, content: request.context }] : []),
        { role: 'user' as const, content: request.task },
      ],
      tools,
      stopWhen: stepCountIs(maxSteps),
      onStepFinish: (step) => {
        stepCount++;
        toolCallCount += step.toolCalls.length;
        if (step.usage) {
          totalPromptTokens += step.usage.inputTokens ?? 0;
          totalCompletionTokens += step.usage.outputTokens ?? 0;
        }

        emit({
          type: 'subagent_step',
          sessionID: subAgentSessionID,
          agentID,
          timestamp: Date.now(),
          payload: {
            stepNumber: step.stepNumber,
            text: step.text,
            toolCalls: step.toolCalls.map((tc) => ({ name: tc.toolName, id: tc.toolCallId })),
            usage: step.usage,
          },
        });
      },
      abortSignal,
    });

    const text = await result.text;

    emit({
      type: 'subagent_end',
      sessionID: subAgentSessionID,
      agentID,
      timestamp: Date.now(),
      payload: {
        text,
        steps: stepCount,
        toolCalls: toolCallCount,
        usage: {
          inputTokens: totalPromptTokens,
          outputTokens: totalCompletionTokens,
        },
      },
    });

    return {
      output: text,
      toolCalls: toolCallCount,
      steps: stepCount,
      usage: {
        inputTokens: totalPromptTokens,
        outputTokens: totalCompletionTokens,
      },
    };
  });
}
