import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { SYSTEM_PROMPT, createArtifactTool } from './ai/config';

export async function chatCompletion({ messages, apiKey, modelName }: { messages: any[], apiKey: string, modelName: string }) {
  const google = createGoogleGenerativeAI({
    apiKey,
  });

  const result = await streamText({
    model: google(modelName),
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      create_artifact: tool({
        description: createArtifactTool.description,
        parameters: createArtifactTool.parameters,
        // @ts-ignore
        execute: async (args: any) => {
          return { success: true, ...args };
        },
      }),
    },
  });

  return result;
}
