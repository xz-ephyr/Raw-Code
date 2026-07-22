import { Effect, Schema } from "effect"
import { Protocol } from "../route/protocol"
import type { LLMRequest, ToolCallPart } from "../schema"
import { LLMError, InvalidRequestReason } from "../schema/errors"
import { Usage } from "../schema/event-schemas"
import type { LLMEvent } from "../schema/event-schemas"

interface GeminiPart {
  text?: string
  thought?: boolean
  inlineData?: { mimeType: string; data: string }
  functionCall?: { name: string; args: Record<string, unknown> }
  functionResponse?: { name: string; response: Record<string, unknown> }
}

interface GeminiContent {
  role: "user" | "model"
  parts: GeminiPart[]
}

export interface GeminiRequestBody {
  contents: GeminiContent[]
  systemInstruction?: { parts: Array<{ text: string }> }
  generationConfig?: {
    maxOutputTokens?: number
    temperature?: number
    topP?: number
    topK?: number
    stopSequences?: string[]
    responseMimeType?: string
    responseSchema?: Record<string, unknown>
  }
  tools?: Array<{
    functionDeclarations: Array<{
      name: string
      description?: string
      parameters?: Record<string, unknown>
    }>
  }>
  toolConfig?: {
    functionCallingConfig?: {
      mode?: string
      allowedFunctionNames?: string[]
    }
  }
}

interface GeminiStreamCandidate {
  content?: {
    parts?: Array<GeminiPart>
    role?: string
  }
  finishReason?: string
  index: number
}

interface GeminiStreamChunk {
  candidates?: GeminiStreamCandidate[]
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
  promptFeedback?: {
    blockReason?: string
  }
}

interface GeminiState {
  textBlocks: Record<string, { index: number; text: string }>
  toolCalls: Record<string, { name: string; args: string; index: number }>
  intentEmitted: boolean
  intentText: string
  toolNames: string[]
  stepIndex: number
  finished: boolean
  usage?: Usage
}

function convertContentPartToGemini(part: any): GeminiPart | undefined {
  switch (part.type) {
    case "text":
      return { text: part.text }
    case "media":
      if (typeof part.mediaType === "string" && part.mediaType.startsWith("image/")) {
        return { inlineData: { mimeType: part.mediaType, data: part.data || "" } }
      }
      return undefined
    default:
      return undefined
  }
}

function convertToolDefinition(tool: any) {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema as Record<string, unknown>,
  }
}

function convertToolChoice(choice: any): { mode?: string; allowedFunctionNames?: string[] } | undefined {
  if (!choice) return undefined
  if (typeof choice === "string") {
    switch (choice) {
      case "auto": return { mode: "AUTO" }
      case "none": return { mode: "NONE" }
      case "required": return { mode: "ANY" }
      default: return undefined
    }
  }
  if (choice.type === "tool" && choice.name) {
    return { mode: "ANY", allowedFunctionNames: [choice.name] }
  }
  return undefined
}

function mapFinishReason(reason: string | undefined): any {
  if (!reason) return "unknown"
  switch (reason) {
    case "STOP": return "stop"
    case "MAX_TOKENS": return "length"
    case "SAFETY": return "content-filter"
    case "RECITATION": return "content-filter"
    case "OTHER": return "unknown"
    case "PROHIBITED_CONTENT": return "content-filter"
    case "SPII": return "content-filter"
    case "BLOCKLIST": return "content-filter"
    default: return "unknown"
  }
}

const textLabel = (index: number) => `text:${index}`
const toolLabel = (index: number, tcIndex: number) => `tool:${index}:${tcIndex}`

export const GeminiProtocol = Protocol.make<GeminiRequestBody, string, GeminiStreamChunk, GeminiState>({
  id: "google-gemini",

  body: {
    schema: Schema.Unknown as Schema.Schema<GeminiRequestBody, unknown>,

    from: (request: LLMRequest) =>
      Effect.try({
        try: () => {
          const contents: GeminiContent[] = []

          let systemInstruction: { parts: Array<{ text: string }> } | undefined
          if (request.system.length > 0) {
            systemInstruction = {
              parts: request.system.map((p) => ({ text: p.text })),
            }
          }

          for (const msg of request.messages) {
            if (msg.role === "system") {
              const text = msg.content
                .filter((p: any) => p.type === "text")
                .map((p: any) => p.text)
                .join("\n")
              contents.push({ role: "user", parts: [{ text }] })

            } else if (msg.role === "user") {
              const parts = msg.content
                .map((p: any) => convertContentPartToGemini(p))
                .filter((p): p is GeminiPart => p !== undefined)
              contents.push({ role: "user", parts: parts.length > 0 ? parts : [{ text: "" }] })

            } else if (msg.role === "assistant") {
              const textParts = msg.content.filter((p: any) => p.type === "text") as Array<{ text: string }>
              const toolCallParts = msg.content.filter((p: any) => p.type === "tool-call") as ToolCallPart[]

              const parts: GeminiPart[] = []
              const combinedText = textParts.map((p) => p.text).join("")
              if (combinedText) parts.push({ text: combinedText })
              for (const tc of toolCallParts) {
                parts.push({
                  functionCall: {
                    name: tc.name,
                    args: tc.input as Record<string, unknown>,
                  },
                })
              }
              contents.push({ role: "model", parts })

            } else if (msg.role === "tool") {
              for (const part of msg.content) {
                if (part.type === "tool-result") {
                  const val = typeof part.result.value === "string"
                    ? part.result.value
                    : JSON.stringify(part.result.value)
                  contents.push({
                    role: "user",
                    parts: [{
                      functionResponse: {
                        name: part.name,
                        response: { result: val },
                      },
                    }],
                  })
                }
              }
            }
          }

          const body: GeminiRequestBody = { contents }
          if (systemInstruction) body.systemInstruction = systemInstruction

          const gen = request.generation
          const generationConfig: GeminiRequestBody["generationConfig"] = {}
          if (gen) {
            if (gen.maxTokens !== undefined) generationConfig.maxOutputTokens = gen.maxTokens
            if (gen.temperature !== undefined) generationConfig.temperature = gen.temperature
            if (gen.topP !== undefined) generationConfig.topP = gen.topP
            if (gen.stop !== undefined) generationConfig.stopSequences = Array.isArray(gen.stop) ? gen.stop : [gen.stop]
          }
          if (Object.keys(generationConfig).length > 0) {
            body.generationConfig = generationConfig
          }

          if (request.tools.length > 0) {
            body.tools = [{
              functionDeclarations: request.tools.map(convertToolDefinition),
            }]
            const tc = convertToolChoice(request.toolChoice)
            if (tc) body.toolConfig = { functionCallingConfig: tc }
          }

          return body
        },
        catch: (error) => new LLMError({
          module: "GeminiProtocol",
          method: "from",
          reason: new InvalidRequestReason({
            message: error instanceof Error ? error.message : String(error),
          }),
        }) as LLMError,
      }),
  },

  stream: {
    event: Schema.parseJson(Schema.Unknown).pipe(
      Schema.transformOrFail(Schema.Any as Schema.Schema<GeminiStreamChunk, unknown>,
        {
          strict: false,
          decode: (u) => Effect.succeed(u as GeminiStreamChunk),
          encode: (u) => Effect.succeed(u),
        },
      ),
    ),

    initial: (): GeminiState => ({
      textBlocks: {},
      toolCalls: {},
      intentEmitted: false,
      intentText: "",
      toolNames: [],
      stepIndex: 0,
      finished: false,
    }),

    step: (state: GeminiState, chunk: GeminiStreamChunk) =>
      Effect.gen(function* () {
        const events: Array<LLMEvent> = []

        if (chunk.promptFeedback?.blockReason) return [state, events] as const
        if (!chunk.candidates || chunk.candidates.length === 0) return [state, events] as const

        const candidate = chunk.candidates[0]
        const index = candidate.index
        const parts = candidate.content?.parts ?? []
        const finishReason = candidate.finishReason

        const newTextBlocks = { ...state.textBlocks }
        const newToolCalls = { ...state.toolCalls }
        let newIntentEmitted = state.intentEmitted
        let newIntentText = state.intentText
        const newToolNames = [...state.toolNames]
        let newUsage = state.usage
        let newStepIndex = state.stepIndex
        let newFinished = state.finished

        for (const part of parts) {
          if (part.functionCall && !newToolNames.includes(part.functionCall.name)) {
            newToolNames.push(part.functionCall.name)
          }
        }

        for (const part of parts) {
          if (part.text) {
            const key = textLabel(index)
            const existing = newTextBlocks[key]
            const isThought = !!part.thought

            if (!existing) {
              newTextBlocks[key] = { index, text: part.text }
              events.push({ type: "step-start", index: newStepIndex } as any)
              if (isThought) {
                events.push({ type: "reasoning-start", id: key } as any)
              } else {
                events.push({ type: "text-start", id: key } as any)
              }

              if (!state.intentEmitted) {
                newIntentEmitted = true
                newIntentText = isThought ? "Reasoning..." : part.text
                events.push({
                  type: "intent",
                  id: `intent:${index}:${Date.now()}`,
                  text: newIntentText,
                  toolNames: newToolNames.length > 0 ? newToolNames : undefined
                } as any)
              }
            } else {
              newTextBlocks[key] = { ...existing, text: existing.text + part.text }
            }

            if (isThought) {
              events.push({ type: "reasoning-delta", id: key, text: part.text } as any)
            } else {
              events.push({ type: "text-delta", id: key, text: part.text } as any)
            }
          }

          if (part.functionCall) {
            const args = JSON.stringify(part.functionCall.args)
            const tcIndex = Object.keys(newToolCalls).length
            const key = toolLabel(index, tcIndex)
            newToolCalls[key] = { name: part.functionCall.name, args, index }
            events.push({ type: "tool-input-start", id: key, name: part.functionCall.name } as any)
            events.push({ type: "tool-input-delta", id: key, text: args } as any)
            events.push({ type: "tool-input-end", id: key, name: part.functionCall.name } as any)

            let parsed: unknown
            try { parsed = part.functionCall.args } catch { parsed = args }
            events.push({ type: "tool-call", id: key, name: part.functionCall.name, input: parsed } as any)

            if (!state.intentEmitted) {
              newIntentEmitted = true
              newIntentText = `Using ${part.functionCall.name} tool...`
              events.push({ type: "intent", id: `intent:${index}:${Date.now()}`, text: `Using ${part.functionCall.name} tool...`, toolNames: newToolNames.length > 0 ? newToolNames : undefined } as any)
            }
          }
        }

        if (finishReason && !newFinished) {
          newFinished = true

          for (const key of Object.keys(newTextBlocks)) {
            events.push({ type: "text-end", id: key } as any)
          }

          const reason = mapFinishReason(finishReason)
          if (chunk.usageMetadata) {
            newUsage = new Usage({
              inputTokens: chunk.usageMetadata.promptTokenCount,
              outputTokens: chunk.usageMetadata.candidatesTokenCount,
              totalTokens: chunk.usageMetadata.totalTokenCount,
            })
            events.push({ type: "step-finish", index: newStepIndex, reason, usage: newUsage } as any)
            events.push({ type: "finish", reason, usage: newUsage } as any)
          } else {
            events.push({ type: "step-finish", index: newStepIndex, reason } as any)
            events.push({ type: "finish", reason } as any)
          }
        }

        return [{
          textBlocks: newTextBlocks,
          toolCalls: newToolCalls,
          intentEmitted: newIntentEmitted,
          intentText: newIntentText,
          toolNames: newToolNames,
          stepIndex: newStepIndex,
          finished: newFinished,
          usage: newUsage,
        }, events] as const
      }),

    terminal: (chunk: GeminiStreamChunk) =>
      chunk.candidates?.[0]?.finishReason !== undefined ||
      chunk.promptFeedback?.blockReason !== undefined,

    onHalt: (state: GeminiState) => {
      const events: Array<LLMEvent> = []
      for (const key of Object.keys(state.textBlocks)) {
        events.push({ type: "text-end", id: key } as any)
      }
      for (const [key, tc] of Object.entries(state.toolCalls)) {
        const entry = tc as { name: string; args: string }
        events.push({ type: "tool-input-end", id: key, name: entry.name } as any)
        let parsed: unknown
        try { parsed = JSON.parse(entry.args) } catch { parsed = entry.args }
        events.push({ type: "tool-call", id: key, name: entry.name, input: parsed } as any)
      }
      const fin = events.length > 0
        ? { type: "finish", reason: "tool-calls" as any }
        : { type: "finish", reason: "stop" as any }
      events.push(fin as any)
      return events
    },
  },
})
