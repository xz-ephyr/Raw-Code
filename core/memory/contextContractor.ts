import { generateText, LanguageModel } from 'ai';

interface Message {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
}

export async function contractContext(messages: Message[], model: LanguageModel): Promise<{ messages: Message[]; summary: string }> {
  // If no messages or only one, no need to contract
  if (messages.length <= 1) return { messages, summary: '' };

  const history = messages.map(m => {
    const text = typeof m.content === 'string'
      ? m.content
      : Array.isArray(m.content)
        ? m.content.filter((p: { type: string; text?: string }) => p.type === 'text').map((p: { type: string; text?: string }) => p.text).join('')
        : '';
    return `${m.role}: ${text}`;
  }).join('\n\n');

  try {
    const { text: summary } = await generateText({
      model,
      prompt: `Provide a concise, detailed summary of the following conversation history. This summary will be used as context for yourself. Focus on the core tasks, decisions, and established technical details.

      CONVERSATION HISTORY:
      ${history}

      CONCISE SUMMARY:`,
    });

    // Match the format of input messages (array content vs string content)
    const hasArrayContent = messages.some(m => Array.isArray(m.content));
    const summaryContent = `SUMMARY OF PREVIOUS CONVERSATION: ${summary}`;
    const summaryMsg = hasArrayContent
      ? { role: 'user' as const, content: [{ type: 'text' as const, text: summaryContent }] }
      : { role: 'user' as const, content: summaryContent };

    return {
      messages: [
        summaryMsg,
        ...messages.slice(-4), // Keep some recent history for continuity
      ],
      summary,
    };
  } catch (error) {
    console.error('Context contraction failed:', error);
    // Fallback: Return last 10 messages if summarization fails
    return { messages: messages.slice(-10), summary: '' };
  }
}
