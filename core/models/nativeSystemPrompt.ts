import { SYSTEM_PROMPT } from "@core/prompt/systemPrompt"
import { buildToolPolicy } from "@core/prompt/toolPolicy"
import { getSmartSystemPrompt, type ProjectContext } from "@core/memory/contextController"
import { getProjectMemory, type ProjectMemoryEntry } from "@core/memory/projectMemory"
import { getConnectorSystemPrompt } from "./connectorPrompts"

const styleInstructions: Record<string, string> = {
  concise: `\n\n### RESPONSE STYLE: CONCISE
- Keep responses as short as possible while still answering completely.
- Prefer bullet points over paragraphs.
- Skip introductions and conclusions.
- One sentence per point. No fluff.`,
  balanced: `\n\n### RESPONSE STYLE: BALANCED
- Use clean markdown. Headings, lists, spacing — make it scannable.
- Answer decisively. No apologies, no disclaimers.
- Group related info into sections. One idea = one paragraph.
- If the answer is short, keep it short.`,
  detailed: `\n\n### RESPONSE STYLE: DETAILED
- Provide comprehensive answers with full context.
- Include examples, edge cases, and alternative approaches.
- Explain reasoning and tradeoffs explicitly.
- Don't sacrifice depth for brevity.`,
}

export interface NativePromptOptions {
  modeId?: string
  projectId?: string
  projectContext?: ProjectContext
  connectedConnectors?: string[]
  responseStyle?: string
}

export async function buildNativeSystemPrompt(opts: NativePromptOptions): Promise<string> {
  const modePrompt = opts.modeId ?? ""
  const modeAwarePrompt = modePrompt ? `${SYSTEM_PROMPT}\n${modePrompt}` : SYSTEM_PROMPT

  let projectMemory: ProjectMemoryEntry[] | undefined
  if (opts.projectId) {
    try {
      const allMemory = await getProjectMemory(opts.projectId)
      projectMemory = allMemory.filter((e: ProjectMemoryEntry) => e.source !== "auto-discovered")
    } catch { /* ignore */ }
  }

  const toolPolicy = buildToolPolicy()

  let connectorPrompt = ""
  if (opts.connectedConnectors && opts.connectedConnectors.length > 0) {
    try {
      const { ConnectorApi } = await import("@core/utils/ConnectorApi")
      for (const provider of opts.connectedConnectors) {
        try {
          const status = await ConnectorApi.getStatus(provider)
          connectorPrompt += getConnectorSystemPrompt(provider, status.identity)
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }

  let fullPrompt = getSmartSystemPrompt(modeAwarePrompt, opts.projectContext, projectMemory)
  fullPrompt += connectorPrompt + "\n\n" + toolPolicy

  const responseStyle = opts.responseStyle
    ?? (typeof localStorage !== "undefined" ? localStorage.getItem("response_style") || "balanced" : "balanced")
  fullPrompt += styleInstructions[responseStyle] || styleInstructions.balanced

  if (typeof localStorage !== "undefined") {
    const customInstructions = localStorage.getItem("ai_rules") || ""
    if (customInstructions.trim()) {
      fullPrompt += `\n\n### USER CUSTOM INSTRUCTIONS\n${customInstructions.trim()}\n`
    }
  }

  return fullPrompt
}
