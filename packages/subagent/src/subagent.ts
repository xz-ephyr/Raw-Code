import { Effect, Stream } from 'effect';
import type { SubAgentRequest, SubAgentResult, ToolResult } from './types';
import type { Materialization } from '@doktor/tool-runtime';
import { emit } from '@doktor/tool-runtime';
import { buildSystemPrompt, getToolScope, getMaxSteps } from './personalities';
import {
  createToolLoop,
  LLMRequest,
  Model,
  SystemPart,
  HttpOptions,
  makeToolDefinition,
  makeToolChoice,
  systemMessage,
  userMessage,
  ModelRoutesProvider,
} from '@doktor/llm-providers';
import { PROVIDER_CONFIGS } from '@doktor/llm-providers/model-registry';
import type { ToolExecutor, ToolCallInput, ToolResultOutput } from '@doktor/llm-providers';

const { allRoutes, getRouteByModelId } = ModelRoutesProvider

function getRoute(modelId: string) {
  return getRouteByModelId(modelId) ?? allRoutes[0]
}

export function runSubAgent(
  request: SubAgentRequest,
  materialization: Materialization,
  abortSignal?: AbortSignal,
): Effect.Effect<SubAgentResult, Error> {
  return Effect.gen(function* () {
    const subAgentSessionID = `sub_${crypto.randomUUID()}`;
    const agentID = request.agentType ?? 'default';

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

    const scope = getToolScope(request.agentType, request.toolScope);
    const maxSteps = getMaxSteps(request.agentType, request.maxSteps);

    let filteredMat = materialization;
    if (scope) {
      const allowedNames = new Set(scope);
      const filteredDefs = materialization.definitions.filter((d) => allowedNames.has(d.name));
      const filteredDefsMap = new Map(filteredDefs.map((d) => [d.name, d]));
      filteredMat = {
        definitions: filteredDefs,
        definitionsMap: filteredDefsMap,
        settle: async (call, context) => {
          if (!allowedNames.has(call.name)) {
            return { type: 'error', message: `Tool "${call.name}" is not allowed in this scope` } as const;
          }
          return materialization.settle(call, context);
        },
      };
    }

    const modelId = typeof request.model === 'string' ? request.model : (PROVIDER_CONFIGS.google?.defaultModel ?? 'gemini-2.5-flash');
    const route = getRoute(modelId)
    const provider = route.provider as string
    const model = Model.make({ id: modelId, provider, route })

    const toolDefs = filteredMat.definitions.map((d) =>
      makeToolDefinition({ name: d.name, description: d.description, inputSchema: d.inputSchema }),
    )

    const system = SystemPart.make(buildSystemPrompt(request))

    let apiKey: string | undefined
    if (request.resolveCredential) {
      apiKey = request.resolveCredential(provider)
    }

    const llmRequest = new LLMRequest({
      model,
      system: [system],
      messages: [
        ...(request.context ? [systemMessage(request.context)] : []),
        userMessage(request.task),
      ],
      tools: toolDefs,
      toolChoice: makeToolChoice('auto'),
      http: apiKey ? new HttpOptions({ headers: { authorization: `Bearer ${apiKey}` } }) : undefined,
    })

    const loop = createToolLoop({ routes: [route], maxSteps, abortSignal })

    const executor: ToolExecutor = (call: ToolCallInput) =>
      Effect.tryPromise({
        try: () =>
          filteredMat.settle(
            { id: call.id, name: call.name, input: call.input },
            {
              sessionID: subAgentSessionID,
              agentID,
              assistantMessageID: `msg_${crypto.randomUUID()}`,
              toolCallID: call.id,
              abortSignal,
              resolveCredential: request.resolveCredential,
            },
          ),
        catch: (err) => new Error(String(err)),
      }).pipe(
        Effect.flatMap((result: any) => {
          if (result.type === 'error') return Effect.fail(new Error(result.message))
          return Effect.succeed({ id: call.id, name: call.name, result: result.value } as ToolResultOutput)
        }),
      )

    const stream = loop(llmRequest, executor)

    let text = ''
    let toolCallCount = 0
    let stepCount = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0
    const toolResults: ToolResult[] = []

    const streamEffect = Stream.runForEach(stream, (event) =>
      Effect.sync(() => {
        if (event.type === 'text-delta') text += event.text ?? ''
        if (event.type === 'tool-call') toolCallCount++
        if (event.type === 'tool-result') {
          const result: ToolResult = {
            name: event.name,
            input: event.input ?? {},
            output: event.result ?? {},
            error: event.error,
          }
          toolResults.push(result)
        }
        if (event.type === 'step-finish') {
          stepCount++
          emit({
            type: 'subagent_step',
            sessionID: subAgentSessionID,
            agentID,
            timestamp: Date.now(),
            payload: { steps: stepCount, toolCalls: toolCallCount },
          })
        }
        if (event.type === 'finish') {
          const usage = (event as { usage?: { inputTokens?: number; outputTokens?: number } }).usage;
          totalInputTokens += usage?.inputTokens ?? 0
          totalOutputTokens += usage?.outputTokens ?? 0
        }
      }),
    );

    yield* streamEffect.pipe(
      Effect.catchAll((err) => {
        const error = err instanceof Error ? err : new Error(String(err));
        emit({
          type: 'subagent_end',
          sessionID: subAgentSessionID,
          agentID,
          timestamp: Date.now(),
          payload: {
            text,
            steps: stepCount,
            toolCalls: toolCallCount,
            error: error.message,
            usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
          },
        });
        return Effect.fail(error);
      }),
    );

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
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
        },
      },
    });

    return {
      output: text,
      toolCalls: toolCallCount,
      steps: stepCount,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
      toolResults,
    } as SubAgentResult;
  });
}
