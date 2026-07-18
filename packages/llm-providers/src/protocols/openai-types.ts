export interface OpenAIChatMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string | null | ReadonlyArray<OpenAIChatContentPart>
  name?: string
  tool_call_id?: string
  tool_calls?: ReadonlyArray<OpenAIToolCall>
}

export type OpenAIChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } }
  | { type: "input_audio"; input_audio: { data: string; format: string } }

export interface OpenAIToolCall {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

export type OpenAIChatBody = {
  model: string
  messages: ReadonlyArray<OpenAIChatMessage>
  stream: boolean
  stream_options?: { include_usage: boolean }
  tools?: ReadonlyArray<OpenAIToolDefinition>
  tool_choice?: string | { type: "function"; function: { name: string } }
  response_format?: { type: "json_object" | "text" } | { type: "json_schema"; json_schema: { name: string; schema: Record<string, unknown>; strict?: boolean } }
  max_tokens?: number
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  seed?: number
  stop?: string | ReadonlyArray<string>
  user?: string
  reasoning_effort?: string
  metadata?: Record<string, unknown>
}

export interface OpenAIToolDefinition {
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
    strict?: boolean
  }
}

export interface OpenAIStreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: ReadonlyArray<{
    index: number
    delta: {
      role?: string
      content?: string | null
      reasoning_content?: string | null
      refusal?: string | null
      tool_calls?: ReadonlyArray<{
        index: number
        id?: string
        type?: string
        function?: { name?: string; arguments?: string }
      }>
    }
    finish_reason: string | null
    logprobs?: unknown
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    completion_tokens_details?: {
      reasoning_tokens?: number
    }
  }
  service_tier?: string
  system_fingerprint?: string
}

export type OpenAIStreamEvent = OpenAIStreamChunk

export interface OpenAIChatState {
  readonly textBlocks: Readonly<Record<string, { readonly index: number; readonly text: string }>>
  readonly reasoningBlocks: Readonly<Record<string, { readonly index: number; readonly text: string }>>
  readonly toolCalls: Readonly<Record<string, { readonly name: string; readonly args: string; readonly index: number }>>
  readonly intentEmitted: boolean
  readonly intentText: string
  readonly toolNames: ReadonlyArray<string>
}
