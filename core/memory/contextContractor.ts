import { generateText, LanguageModel } from 'ai';

interface Message {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
}

const CONTRACT_TIMEOUT = 30_000;
const MAX_RETRIES = 3;

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

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('502') || msg.includes('503') || msg.includes('504')
    || msg.includes('timeout') || msg.includes('econnreset')
    || msg.includes('econnrefused') || msg.includes('network');
}

export async function contractContext(messages: Message[], model: LanguageModel): Promise<{ messages: Message[]; summary: string }> {
  if (messages.length <= 1) return { messages, summary: '' };

  const history = messages.map(m => `${m.role}: ${extractText(m.content)}`).join('\n\n');

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONTRACT_TIMEOUT);
      try {
        const { text: summary } = await generateText({
          model,
          abortSignal: controller.signal,
          prompt: `Provide a concise, detailed summary of the following conversation history. This summary will be used as context for yourself. Focus on the core tasks, decisions, and established technical details.

          CONVERSATION HISTORY:
          ${history}

          CONCISE SUMMARY:`,
        });

        const hasArrayContent = messages.some(m => Array.isArray(m.content));
        const summaryContent = `SUMMARY OF PREVIOUS CONVERSATION: ${summary}`;
        const summaryMsg = hasArrayContent
          ? { role: 'user' as const, content: [{ type: 'text' as const, text: summaryContent }] }
          : { role: 'user' as const, content: summaryContent };

        return {
          messages: [
            summaryMsg,
            ...messages.slice(-4),
          ],
          summary,
        };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error)) break;
      console.warn(`Context contraction attempt ${attempt + 1}/${MAX_RETRIES} failed:`, error);
    }
  }

  console.error('Context contraction failed after all retries:', lastError);
  return { messages: messages.slice(-10), summary: '' };
}
