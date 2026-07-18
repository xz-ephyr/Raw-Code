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
import { materialize } from "@doktor/tool-runtime"
import { providerRouteMap, proxyGpt4o } from "@core/tools/nativeRoutes"
import { buildNativeSystemPrompt } from "./nativeSystemPrompt"
import type { ProjectContext } from "@core/memory/contextController"
import { userMessage, assistantMessage, toolMessage } from "@doktor/llm-providers"
import { getProviders } from "./providerCache"
import { getModelDefinition } from "@core/config/models"

function selectRoute(modelName: string) {
  const def = getModelDefinition(modelName)
  if (def && providerRouteMap[def.provider]) {
    return providerRouteMap[def.provider]
  }
  return proxyGpt4o
}

function convertMessages(msgs: any[]) {
  return msgs
    .filter((m: any) => m.role !== "system")
    .map((m: any) => {
      switch (m.role) {
        case "user": {
          const content = typeof m.content === "string" ? m.content : m.content?.[0]?.text ?? ""
          return userMessage(content)
        }
        case "assistant": {
          const content = typeof m.content === "string" ? m.content : ""
          return assistantMessage(content)
        }
        case "tool":
          return toolMessage({ id: m.toolCallId ?? "", name: m.toolName ?? "", result: m.content ?? "" })
        default:
          return userMessage(String(m.content ?? ""))
      }
    })
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
  const providerId = def?.provider || "openai"
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
    apiKey = localStorage.getItem(configKey) || localStorage.getItem("openai_api_key") || ""
  }

  const systemPrompt = await buildNativeSystemPrompt({
    modeId: input.modeId,
    projectId: input.projectId,
    projectContext: input.projectContext,
    connectedConnectors: input.connectedConnectors,
  })

  const mat = materialize()
  const toolDefs = mat.definitions.map((d) =>
    makeToolDefinition({ name: d.name, description: d.description, inputSchema: d.inputSchema }),
  )

  const request = new LLMRequest({
    model,
    system: [SystemPart.make(systemPrompt)],
    messages: convertMessages(input.messages),
    tools: toolDefs,
    toolChoice: makeToolChoice("auto"),
    http: apiKey ? new HttpOptions({ headers: { authorization: `Bearer ${apiKey}` } }) : undefined,
  })

  const loop = createToolLoop({ routes: [route], abortSignal: input.abortSignal })

  const resolveCredential = (provider: string): string | undefined => {
    const defs = getModelDefinition(input.modelName)
    const useProvider = provider || defs?.provider || "openai"
    const configKey = `${useProvider}-api-key`
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(configKey) || localStorage.getItem("openai_api_key") || undefined
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
