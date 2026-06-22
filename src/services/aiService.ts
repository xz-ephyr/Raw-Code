import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createCerebras } from '@ai-sdk/cerebras';
import { streamText, stepCountIs, tool, convertToModelMessages } from 'ai';
import type { OpenAIProvider } from '@ai-sdk/openai';
import {
  SYSTEM_PROMPT,
  createArtifactTool,
  readFileTool,
  writeFileTool,
  editFileTool,
  writeToPlanTool,
  listDirTool,
  grepTool,
} from './ai/config';
import { FileSystemService } from './FileSystemService';
import { resolveProjectPath } from '../lib/projectPaths';
import { API_KEYS, getModelDefinition, getUsedModels, markModelUsed, AI_MODELS } from '../config/models';
import { getSmartSystemPrompt } from './ai/contextController';
import { contractContext } from './ai/contextContractor';

let cachedProviders: {
  google: ReturnType<typeof createGoogleGenerativeAI>;
  groq: ReturnType<typeof createGroq>;
  mistral: ReturnType<typeof createMistral>;
  openrouter: OpenAIProvider;
  opencodezen: OpenAIProvider;
  cerebras: ReturnType<typeof createCerebras>;
} | null = null;
let cachedGoogleKey = '';
let cachedGroqKey = '';
let cachedMistralKey = '';
let cachedOpenrouterKey = '';
let cachedOpencodezenKey = '';
let cachedCerebrasKey = '';

export function refreshProviders() {
  cachedProviders = null;
}

function getProviders() {
  const currentGoogleKey = localStorage.getItem(API_KEYS.google) || '';
  const currentGroqKey = localStorage.getItem(API_KEYS.groq) || '';
  const currentMistralKey = localStorage.getItem(API_KEYS.mistral) || '';
  const currentOpenrouterKey = localStorage.getItem(API_KEYS.openrouter) || '';
  const currentOpencodezenKey = localStorage.getItem(API_KEYS.opencodezen) || '';
  const currentCerebrasKey = localStorage.getItem(API_KEYS.cerebras) || '';
  if (
    !cachedProviders ||
    currentGoogleKey !== cachedGoogleKey ||
    currentGroqKey !== cachedGroqKey ||
    currentMistralKey !== cachedMistralKey ||
    currentOpenrouterKey !== cachedOpenrouterKey ||
    currentOpencodezenKey !== cachedOpencodezenKey ||
    currentCerebrasKey !== cachedCerebrasKey
  ) {
    cachedGoogleKey = currentGoogleKey;
    cachedGroqKey = currentGroqKey;
    cachedMistralKey = currentMistralKey;
    cachedOpenrouterKey = currentOpenrouterKey;
    cachedOpencodezenKey = currentOpencodezenKey;
    cachedCerebrasKey = currentCerebrasKey;
    cachedProviders = {
      google: createGoogleGenerativeAI({ apiKey: currentGoogleKey }),
      groq: createGroq({ apiKey: currentGroqKey }),
      mistral: createMistral({ apiKey: currentMistralKey }),
      openrouter: createOpenAI({
        apiKey: currentOpenrouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      }),
      opencodezen: createOpenAI({
        apiKey: currentOpencodezenKey,
        baseURL: localStorage.getItem('opencodezen-base-url') || 'https://opencode.ai/zen/v1',
      }),
      cerebras: createCerebras({ apiKey: currentCerebrasKey }),
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
  sessionId,
}: {
  messages: any[];
  modelName: string;
  projectContext?: string;
  projectPath?: string;
  isThinkingEnabled?: boolean;
  abortSignal?: AbortSignal;
  previousModelName?: string;
  sessionId?: string;
}) {
  const providers = getProviders();

  let processedMessages = messages;

  const getLanguageModel = (name: string) => {
    const def = getModelDefinition(name);
    if (!def) return providers.google('gemini-3.5-flash');

    if (def.provider === 'google') return providers.google(def.id);
    if (def.provider === 'groq') return providers.groq(def.id);
    if (def.provider === 'mistral') return providers.mistral(def.id);
    if (def.provider === 'openrouter') return providers.openrouter(def.id);
    if (def.provider === 'opencodezen') return providers.opencodezen(def.id);
    if (def.provider === 'cerebras') return providers.cerebras(def.id);
    return providers.google('gemini-3.5-flash');
  };

  const used = sessionId ? getUsedModels(sessionId) : [];
  const fallbackChain = [
    modelName,
    ...AI_MODELS.filter(m => m !== modelName && !used.includes(m)),
  ];

  const uniqueChain = Array.from(new Set(fallbackChain));

  const fullSystemPrompt = getSmartSystemPrompt(SYSTEM_PROMPT, projectContext);

  const errors: string[] = [];

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
      if (!processedMessages || processedMessages.length === 0) {
        throw new Error('Messages array is empty');
      }

      const hasUIMessages = processedMessages.some((m: any) => Array.isArray(m.parts));
      if (hasUIMessages) {
        const withParts = processedMessages.map((m: any) => {
          if (Array.isArray(m.parts)) return { ...m, id: m.id || crypto.randomUUID() };
          return { id: crypto.randomUUID(), role: m.role, parts: [{ type: 'text' as const, text: m.content || '' }] };
        });
        processedMessages = await convertToModelMessages(withParts, { ignoreIncompleteToolCalls: true });
      } else {
        processedMessages = processedMessages
          .filter((m: any) => m.role !== 'system')
          .map((m: any) => ({ role: m.role, content: m.content || '' }));
      }

      if (previousModelName && previousModelName !== currentModelName) {
        const incomingModel = getLanguageModel(currentModelName);
        processedMessages = await contractContext(processedMessages, incomingModel);
      }

      const filteredMessages = processedMessages.filter((m: any) => m.role !== 'system');

      console.log('[tools] write_file has path?', 'path' in (writeFileTool.parameters as any)?.properties);

      console.log('[streamText]', {
        model: currentModelName,
        count: filteredMessages.length,
        sample: filteredMessages[0],
      });

      return streamText({
        model: currentModel,
        system: fullSystemPrompt,
        messages: filteredMessages,
        providerOptions,
        abortSignal,
        maxRetries: 2,
        stopWhen: stepCountIs(25),
        onError({ error }) {
          console.error(`AI stream failed for ${currentModelName}:`, getAIErrorMessage(error));
        },
        tools: {
          create_artifact: tool({
            description: createArtifactTool.description,
            parameters: createArtifactTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async (args: any) => ({
              success: true,
              type: args.type || 'markdown',
              title: args.title || 'Untitled Artifact',
              content: args.content || '',
            }),
          }),
          read_file: tool({
            description: readFileTool.description,
            parameters: readFileTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({ path }: { path: string }) => {
              if (!projectPath) return { error: 'Not in project mode.' };
              try {
                const fullPath = await resolveProjectPath(projectPath, path);
                if (!fullPath) return { error: `Path escapes project: ${path}.` };
                const content = await FileSystemService.getFileContent(fullPath);
                return { content, path };
              } catch (e: any) {
                return { error: `Failed to read: ${e.message || e}` };
              }
            },
          }),
          write_file: tool({
            description: writeFileTool.description,
            parameters: writeFileTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({ path, content }: { path: string; content: string }) => {
              if (!projectPath)
                return { success: true, is_artifact: true, title: path, content };
              try {
                const fullPath = await resolveProjectPath(projectPath, path);
                if (!fullPath) return { error: `Path escapes project: ${path}.` };
                await FileSystemService.saveFile(fullPath, content);
                return { success: true, path, content };
              } catch (e: any) {
                return { error: `Failed to write: ${e.message || e}` };
              }
            },
          }),
          edit_file: tool({
            description: editFileTool.description,
            parameters: editFileTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({
              path,
              target_content,
              replacement_content,
            }: {
              path: string;
              target_content: string;
              replacement_content: string;
            }) => {
              if (!projectPath) return { error: 'Not in project mode.' };
              try {
                const fullPath = await resolveProjectPath(projectPath, path);
                if (!fullPath) return { error: `Path escapes project: ${path}.` };
                const currentContent = await FileSystemService.getFileContent(fullPath);

                let occurrences = 0;
                let searchIdx = 0;
                while ((searchIdx = currentContent.indexOf(target_content, searchIdx)) !== -1) {
                  occurrences++;
                  searchIdx += target_content.length;
                }
                if (occurrences === 0) {
                  return {
                    error: `Target content not found in ${path}. Your memory might be stale. Please re-read the file and try again.`
                  };
                }
                if (occurrences > 1) {
                  return {
                    error: `Target content found ${occurrences} times in ${path}. To avoid clobbering the wrong code, please provide a more unique 'target_content' by including surrounding lines.`
                  };
                }

                const updatedContent = currentContent.replace(target_content, replacement_content);
                await FileSystemService.saveFile(fullPath, updatedContent);
                return { success: true, path, content: updatedContent };
              } catch (e: any) {
                return { error: `Failed to edit: ${e.message || e}` };
              }
            },
          }),
          write_to_plan: tool({
            description: writeToPlanTool.description,
            parameters: writeToPlanTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({ filename, content }: { filename: string; content: string }) => {
              if (projectPath) {
                try {
                  const fullPath = await resolveProjectPath(projectPath, filename);
                  if (!fullPath) return { error: `Path escapes project: ${filename}.` };
                  await FileSystemService.saveFile(fullPath, content);
                  return { success: true, filename, content };
                } catch (e: any) {
                  return { error: `Failed to write plan: ${e.message || e}` };
                }
              }
              return { success: true, is_artifact: true, title: filename, content };
            },
          }),
          list_dir: tool({
            description: listDirTool.description,
            parameters: listDirTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({ path }: { path: string }) => {
              if (!projectPath) return { error: 'Not in project mode.' };
              try {
                const fullPath = await resolveProjectPath(projectPath, path);
                if (!fullPath) return { error: `Path escapes project: ${path}.` };
                const tree = await FileSystemService.getTree(fullPath);
                return {
                  path,
                  entries: tree.map((e) => ({
                    name: e.name,
                    isDirectory: e.isDirectory,
                  })),
                };
              } catch (e: any) {
                return { error: `Failed to list: ${e.message || e}` };
              }
            },
          }),
          grep_tool: tool({
            description: grepTool.description,
            parameters: grepTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({ pattern, path }: { pattern: string; path: string }) => {
              if (!projectPath) return { error: 'Not in project mode.' };
              try {
                const fullPath = await resolveProjectPath(projectPath, path);
                if (!fullPath) return { error: `Path escapes project: ${path}.` };

                const results: { file: string; line: number; content: string }[] = [];
                const tree = await FileSystemService.getTree(fullPath);

                const regex = new RegExp(pattern, 'i');
                const search = async (entries: any[]) => {
                  for (const entry of entries) {
                    if (entry.isDirectory) {
                      await search(entry.children || []);
                    } else {
                      const content = await FileSystemService.getFileContent(entry.path);
                      const lines = content.split('\n');
                      for (let i = 0; i < lines.length; i++) {
                        if (regex.test(lines[i])) {
                          results.push({
                            file: entry.path.replace(projectPath, '').replace(/^\//, ''),
                            line: i + 1,
                            content: lines[i].trim(),
                          });
                        }
                        if (results.length >= 200) break;
                      }
                    }
                    if (results.length >= 200) break;
                  }
                };

                await search(tree);
                return { results: results.slice(0, 200) };
              } catch (e: any) {
                return { error: `Grep failed: ${e.message || e}` };
              }
            },
          }),
        },
      });
    } catch (error) {
      if (sessionId) {
        markModelUsed(sessionId, currentModelName);
      }
      errors.push(`${uniqueChain[modelIdx]}: ${getAIErrorMessage(error)}`);
      if (modelIdx < uniqueChain.length - 1) {
        console.warn(`Model ${uniqueChain[modelIdx]} failed, trying fallback...`);
        return getStreamResult(modelIdx + 1);
      }
      throw new Error(
        `All AI models failed. Tried: ${uniqueChain.join(', ')}.\nErrors:\n${errors.join('\n')}\n\nCheck your API keys in Settings.`
      );
    }
  };

  return await getStreamResult(0);
}
