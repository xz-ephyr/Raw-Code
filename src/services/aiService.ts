import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

export async function getChatStream(messages: { role: 'user' | 'assistant'; content: string }[], apiKey: string, modelName: string) {
  const google = createGoogleGenerativeAI({
    apiKey,
  });

  // Call the model and return a stream
  const result = await streamText({
    model: google(modelName),
    messages: messages,
  });

  return result.textStream;
}
