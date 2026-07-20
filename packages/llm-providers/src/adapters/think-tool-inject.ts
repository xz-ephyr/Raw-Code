import { makeToolDefinition } from "../schema/messages"

const THINK_TOOL_DEFINITION = makeToolDefinition({
  name: "think",
  description:
    "Use to reason step-by-step before acting, especially before calling " +
    "another tool or when re-evaluating a result. This does not perform any action.",
  inputSchema: {
    type: "object",
    properties: {
      thought: {
        type: "string",
        description: "Your step-by-step reasoning about what to do and why",
      },
    },
    required: ["thought"],
  },
})

export interface ThinkToolInjectConfig {
  readonly modelId: string
  readonly needsThinkTool: boolean
}

/**
 * Injects the `think` tool into the tool list if the model needs it.
 *
 * Models with native reasoning (o3, Claude Sonnet 4, etc.) emit reasoning-delta
 * events automatically. Models without native reasoning (GPT-4o, Claude Haiku,
 * etc.) need the `think` tool to produce structured reasoning that can be
 * normalized into the same event stream.
 */
export function injectThinkTool(
  tools: readonly ReturnType<typeof makeToolDefinition>[],
  needsThinkTool: boolean,
): ReturnType<typeof makeToolDefinition>[] {
  if (!needsThinkTool) return [...tools]
  if (tools.some((t) => t.name === "think")) return [...tools]
  return [...tools, THINK_TOOL_DEFINITION]
}
