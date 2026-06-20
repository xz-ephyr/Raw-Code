import { generateText, LanguageModel } from 'ai';

export async function contractContext(messages: any[], model: LanguageModel) {
  // If no messages or only one, no need to contract
  if (messages.length <= 1) return messages;

  const history = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

  try {
    const { text: summary } = await generateText({
      model,
      prompt: `Provide a concise, detailed summary of the following conversation history. This summary will be used as context for yourself. Focus on the core tasks, decisions, and established technical details.

      CONVERSATION HISTORY:
      ${history}

      CONCISE SUMMARY:`,
    });

    return [
      {
        role: 'user',
        content: `SUMMARY OF PREVIOUS CONVERSATION: ${summary}`,
      },
      ...messages.slice(-4), // Keep some recent history for continuity
    ];
  } catch (error) {
    console.error('Context contraction failed:', error);
    // Fallback: Return last 10 messages if summarization fails
    return messages.slice(-10);
  }
}
