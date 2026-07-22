import { Stream, Effect } from "effect"
import { createToolLoop } from "@doktor/llm-providers"
import type { ToolExecutor } from "@doktor/llm-providers"
import {
  LLMRequest,
  HttpOptions,
  SystemPart,
  makeToolDefinition,
  makeToolChoice,
} from "@doktor/llm-providers"
import type { LLMEvent } from "@doktor/llm-providers"
import { injectThinkTool } from "@doktor/llm-providers/adapters/think-tool-inject"
import { getModelCapability } from "@core/reasoning/capabilities"
import { materialize } from "@doktor/tool-runtime"
import { ensureToolRuntimeInit } from "@core/tools/initToolRuntime"
import { initializeConnectorTools } from "@doktor/tool-runtime/connector"
import { modelRouteMap, googleRouteForModel } from "@core/tools/nativeRoutes"
import { buildNativeSystemPrompt } from "./nativeSystemPrompt"
import type { ProjectContext } from "@core/memory/contextController"
import { userMessage, assistantMessage, toolMessage, ToolCallPart } from "@doktor/llm-providers"
import { getProviders } from "./providerCache"
import { getModelDefinition } from "@core/config/models"

function selectRoute(modelName: string) {
  if (modelRouteMap[modelName]) {
    return modelRouteMap[modelName]
  }
  return googleRouteForModel(modelName)
}

function convertMessages(msgs: import("@/lib/chatUtils").UIMessage[]) {
  const result: any[] = []
  for (const m of msgs) {
    if (m.role === "system") continue
    switch (m.role) {
      case "user": {
        const content = typeof m.content === "string" ? m.content : ""
        result.push(userMessage(content))
        break
      }
      case "assistant": {
        const textContent = typeof m.content === "string" ? m.content : ""
        const parts: any[] = textContent ? [{ type: "text" as const, text: textContent }] : []
        const toolCalls = m.toolInvocations ?? m.toolCalls ?? []
        const completedToolResults: { id: string; name: string; result: unknown }[] = []
        for (const tc of toolCalls) {
          const isComplete = tc.state === "result" || tc.state === "error" || tc.status === "complete"
          if (!isComplete) continue
          parts.push(ToolCallPart.make({ id: tc.toolCallId ?? tc.id, name: tc.toolName ?? tc.name, input: tc.args ?? tc.input }))
          completedToolResults.push({ id: tc.toolCallId ?? tc.id, name: tc.toolName ?? tc.name, result: tc.result ?? (tc.state === "error" ? tc.error : "") })
        }
        if (parts.length > 0) {
          result.push(assistantMessage(parts))
          for (const tr of completedToolResults) {
            result.push(toolMessage(tr))
          }
        }
        break
      }
      case "tool":
        result.push(toolMessage({ id: m.toolCallId ?? "", name: m.toolName ?? "", result: m.content ?? "" }))
        break
      default:
        result.push(userMessage(String(m.content ?? "")))
        break
    }
  }
  return result
}

export interface NativeChatInput {
  messages: any[]
  modelName: string
  modeId?: string
  projectId?: string
  projectContext?: ProjectContext
  connectedConnectors?: string[]
  abortSignal?: AbortSignal
}

export async function nativeChatCompletion(input: NativeChatInput): Promise<Stream.Stream<LLMEvent, Error>> {
  const route = selectRoute(input.modelName)
  const model = route.model({ id: input.modelName })

  const def = getModelDefinition(input.modelName)
  const providerId = def?.provider || "google"
  const configKey = `${providerId}-api-key`

  let apiKey = ""
  try {
    const providers = await getProviders(input.projectId)
    const client = providers.get(providerId)
    if (client && typeof (client as any).apiKey === "string") {
      apiKey = (client as any).apiKey
    }
  } catch { /* fallback */ }
  if (!apiKey && typeof localStorage !== "undefined") {
    apiKey = localStorage.getItem(configKey) || localStorage.getItem("google-api-key") || ""
  }

  const systemPrompt = await buildNativeSystemPrompt({
    modeId: input.modeId,
    projectId: input.projectId,
    projectContext: input.projectContext,
    connectedConnectors: input.connectedConnectors,
  })

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Register content tools (web_search, etc.) and subagent tools globally
  ensureToolRuntimeInit();

  if (input.projectId && input.connectedConnectors?.length) {
    for (const provider of input.connectedConnectors) {
      await initializeConnectorTools({
        sessionID: input.projectId,
        provider,
        baseUrl,
      }).catch(err => console.warn(`[nativeChat] Failed to init connector ${provider}:`, err));
    }
  }

  const mat = materialize({ sessionID: input.projectId })
  const baseToolDefs = mat.definitions.map((d) =>
    makeToolDefinition({ name: d.name, description: d.description, inputSchema: d.inputSchema }),
  )
  const capability = getModelCapability(input.modelName)
  const needsThinkTool = capability.reasoning === 'none'
  const toolDefs = injectThinkTool(baseToolDefs, needsThinkTool)

  const request = new LLMRequest({
    model,
    system: [SystemPart.make(systemPrompt)],
    messages: convertMessages(input.messages),
    tools: toolDefs,
    toolChoice: makeToolChoice("auto"),
    http: apiKey ? new HttpOptions({ headers: { authorization: `Bearer ${apiKey}` } }) : undefined,
  })

  const loop = createToolLoop({ routes: [route], abortSignal: input.abortSignal, smooth: true })

  const resolveCredential = (_provider: string): string | undefined => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("google-api-key") || undefined
    }
    return undefined
  }

  const executor: ToolExecutor = (call) =>
    Effect.tryPromise({
      try: () =>
        mat.settle(
          { id: call.id, name: call.name, input: call.input },
          {
            sessionID: input.projectId ?? "",
            agentID: "main",
            assistantMessageID: "",
            toolCallID: call.id,
            abortSignal: input.abortSignal,
            resolveCredential,
          },
        ),
      catch: (err) => new Error(String(err)),
    }).pipe(
      Effect.flatMap((result) => {
        if (result.type === "error") return Effect.fail(new Error(result.message))
        return Effect.succeed({ id: call.id, name: call.name, result: result.value })
      }),
    )

  return loop(request, executor)
}
