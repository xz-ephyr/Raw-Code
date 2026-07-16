import { Effect } from "effect"
import { Service as LLMClient, LLMRequest, SystemPart, userMessage, makeGenerationOptions, layer } from "@doktor/llm-providers"
import { proxyGpt4oMini } from "@core/tools/nativeRoutes"
import { getProviders } from "@core/models/providerCache"

interface Message {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
}

function extractText(content: Message['content']): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((p): p is { type: string; text: string } => p.type === 'text' && p.text != null)
      .map(p => p.text)
      .join('');
  }
  return '';
}

async function generateSummaryNative(history: string, projectId?: string): Promise<string | null> {
  const prompt = `Provide a concise, detailed summary of the following conversation history. This summary will be used as context for yourself. Focus on the core tasks, decisions, and established technical details.

CONVERSATION HISTORY:
${history}

CONCISE SUMMARY:`;

  const providers = await getProviders(projectId)
  const openaiClient = providers.get("openai")
  let apiKey = ""
  if (openaiClient && typeof (openaiClient as any).apiKey === "string") {
    apiKey = (openaiClient as any).apiKey
  }
  if (!apiKey) {
    apiKey = typeof localStorage !== "undefined" ? localStorage.getItem("openai_api_key") || "" : ""
  }
  if (!apiKey) return null

  const route = proxyGpt4oMini
  const model = route.model({ id: route.id })

  const request = new LLMRequest({
    model,
    system: [SystemPart.make("You are a helpful assistant that summarizes conversations concisely.")],
    messages: [userMessage(prompt)],
    tools: [],
    toolChoice: undefined,
    generation: makeGenerationOptions({ maxTokens: 500, temperature: 0.3 }),
    http: apiKey ? { headers: { authorization: `Bearer ${apiKey}` } } : undefined,
  })

  const clientLayer = layer([route])

  try {
    const response = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* LLMClient
        return yield* client.generate(request)
      }).pipe(Effect.provide(clientLayer))
    )

    return response.text
  } catch (e) {
    console.warn("Native context contraction failed:", e)
    return null
  }
}

export async function contractContext(messages: Message[], _model?: any, projectId?: string): Promise<{ messages: Message[]; summary: string }> {
  if (messages.length <= 1) return { messages, summary: '' };

  const history = messages.map(m => `${m.role}: ${extractText(m.content)}`).join('\n\n');

  let summary = await generateSummaryNative(history, projectId)
  if (!summary) {
    console.warn("Falling back to heuristic contraction")
    return { messages: messages.slice(-10), summary: '' };
  }

  const hasArrayContent = messages.some(m => Array.isArray(m.content));
  const summaryContent = `SUMMARY OF PREVIOUS CONVERSATION: ${summary}`;
  const summaryMsg = hasArrayContent
    ? { role: 'user' as const, content: [{ type: 'text' as const, text: summaryContent }] }
    : { role: 'user' as const, content: summaryContent };

  const recentMessages = messages.slice(-4);
  const userCount = recentMessages.filter(m => m.role === 'user').length;
  const assistantCount = recentMessages.filter(m => m.role === 'assistant').length;
  if ((userCount === 0 || assistantCount === 0) && messages.length > 4) {
    const extra = messages.slice(-5, -4);
    if (extra.length > 0 && extra[0].role !== recentMessages[0].role) {
      recentMessages.unshift(extra[0]);
    }
  }

  return {
    messages: [
      summaryMsg,
      ...recentMessages,
    ],
    summary,
  };
}