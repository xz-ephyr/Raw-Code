import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { convertToModelMessages, streamText, stepCountIs } from 'ai';
import { SYSTEM_PROMPT } from './ai/config';
import { getSmartSystemPrompt } from './ai/contextController';
import { contractContext } from './ai/contextContractor';
import { createArtifactTool } from './ai/tools/create_artifact';
import { readFileTool } from './ai/tools/read_file';
import { writeFileTool } from './ai/tools/write_file';
import { editFileTool } from './ai/tools/edit_file';
import { listDirTool } from './ai/tools/list_dir';
import { grepTool } from './ai/tools/grep_tool';
import { writeToPlanTool } from './ai/tools/write_to_plan';
import { API_KEYS, getModelDefinition } from '../config/models';

let cachedProviders: { google: ReturnType<typeof createGoogleGenerativeAI>; groq: ReturnType<typeof createGroq> } | null = null;

export function refreshProviders() {
  cachedProviders = null;
}

function getProviders() {
  if (!cachedProviders) {
    cachedProviders = {
      google: createGoogleGenerativeAI({ apiKey: localStorage.getItem(API_KEYS.google) || '' }),
      groq: createGroq({ apiKey: localStorage.getItem(API_KEYS.groq) || '' }),
    };
  }
  return cachedProviders;
}

export function getAIErrorMessage(error: unknown) {
  if (error == null) return 'The AI request failed for an unknown reason.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return 'The AI request failed and the error could not be serialized.';
  }
}

export async function chatCompletion({
  messages,
  modelName,
  projectContext,
  projectPath,
  isThinkingEnabled,
  abortSignal,
  previousModelName,
}: {
  messages: any[];
  modelName: string;
  projectContext?: string;
  projectPath?: string;
  isThinkingEnabled?: boolean;
  abortSignal?: AbortSignal;
  previousModelName?: string;
}) {
  const providers = getProviders();

  let processedMessages = messages;

  const getLanguageModel = (name: string) => {
    const def = getModelDefinition(name);
    if (!def) return providers.google('gemini-3.5-flash');

    if (def.provider === 'google') return providers.google(def.id);
    if (def.provider === 'groq') return providers.groq(def.id);
    return providers.google('gemini-3.5-flash');
  };

  const fallbackChain = [
    modelName,
    'gemini-3.5-flash',
    'llama-3.1-8b-instant',
  ];

  const uniqueChain = Array.from(new Set(fallbackChain));

  const fullSystemPrompt = getSmartSystemPrompt(SYSTEM_PROMPT, projectContext);

  const getStreamResult = async (modelIdx: number): Promise<any> => {
    const currentModelName = uniqueChain[modelIdx];
    const currentModel = getLanguageModel(currentModelName);
    const def = getModelDefinition(currentModelName);
    const shouldApplyThinking = isThinkingEnabled && def?.supportsThinking;

    let providerOptions: any = undefined;
    if (shouldApplyThinking) {
      providerOptions = {};
      if (def?.provider === 'google') {
        providerOptions.google = { thinkingConfig: { thinkingBudget: 1024 } };
      }
    }

    try {
      if (previousModelName && previousModelName !== currentModelName) {
        // Re-evaluate model and messages if routed
        const incomingModel = getLanguageModel(currentModelName);
        processedMessages = await contractContext(messages, incomingModel);
      }

      const normalizedMessages = await convertToModelMessages(
        processedMessages.filter((m: any) => m.role !== 'system')
      );

      return streamText({
        model: currentModel,
        system: fullSystemPrompt,
        messages: normalizedMessages,
        providerOptions,
        abortSignal,
        maxRetries: 2,
        stopWhen: stepCountIs(5),
        onError({ error }) {
          console.error(`AI stream failed for ${currentModelName}:`, getAIErrorMessage(error));
        },
        tools: {
          create_artifact: createArtifactTool(),
          read_file: readFileTool(projectPath),
          write_file: writeFileTool(projectPath),
          edit_file: editFileTool(projectPath),
          list_dir: listDirTool(projectPath),
          grep_tool: grepTool(projectPath),
          write_to_plan: writeToPlanTool(projectPath),
        },
      });
    } catch (error) {
      if (modelIdx < uniqueChain.length - 1) {
        console.warn(`Model ${uniqueChain[modelIdx]} failed to initialize, trying fallback...`);
        return getStreamResult(modelIdx + 1);
      }
      throw error;
    }
  };

  return await getStreamResult(0);
}
