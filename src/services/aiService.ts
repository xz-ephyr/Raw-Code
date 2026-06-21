import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { convertToModelMessages, streamText, stepCountIs, tool } from 'ai';
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
import { API_KEYS, getModelDefinition } from '../config/models';
import { getSmartSystemPrompt } from './ai/contextController';
import { contractContext } from './ai/contextContractor';

let cachedProviders: { google: ReturnType<typeof createGoogleGenerativeAI>; groq: ReturnType<typeof createGroq> } | null = null;
let cachedGoogleKey = '';
let cachedGroqKey = '';

export function refreshProviders() {
  cachedProviders = null;
}

function getProviders() {
  const currentGoogleKey = localStorage.getItem(API_KEYS.google) || '';
  const currentGroqKey = localStorage.getItem(API_KEYS.groq) || '';
  if (!cachedProviders || currentGoogleKey !== cachedGoogleKey || currentGroqKey !== cachedGroqKey) {
    cachedGoogleKey = currentGoogleKey;
    cachedGroqKey = currentGroqKey;
    cachedProviders = {
      google: createGoogleGenerativeAI({ apiKey: currentGoogleKey }),
      groq: createGroq({ apiKey: currentGroqKey }),
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
            execute: async ({ file_path }: { file_path: string }) => {
              if (!projectPath) return { error: 'Not in project mode.' };
              try {
                const fullPath = await resolveProjectPath(projectPath, file_path);
                if (!fullPath) return { error: `Path escapes project: ${file_path}.` };
                const content = await FileSystemService.getFileContent(fullPath);
                return { content, file_path };
              } catch (e: any) {
                return { error: `Failed to read: ${e.message || e}` };
              }
            },
          }),
          write_file: tool({
            description: writeFileTool.description,
            parameters: writeFileTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({ file_path, content }: { file_path: string; content: string }) => {
              if (!projectPath)
                return { success: true, is_artifact: true, title: file_path, content };
              try {
                const fullPath = await resolveProjectPath(projectPath, file_path);
                if (!fullPath) return { error: `Path escapes project: ${file_path}.` };
                await FileSystemService.saveFile(fullPath, content);
                return { success: true, file_path, content };
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
              file_path,
              target_content,
              replacement_content,
            }: {
              file_path: string;
              target_content: string;
              replacement_content: string;
            }) => {
              if (!projectPath) return { error: 'Not in project mode.' };
              try {
                const fullPath = await resolveProjectPath(projectPath, file_path);
                if (!fullPath) return { error: `Path escapes project: ${file_path}.` };
                const currentContent = await FileSystemService.getFileContent(fullPath);

                // Count occurrences
                let occurrences = 0;
                let searchIdx = 0;
                while ((searchIdx = currentContent.indexOf(target_content, searchIdx)) !== -1) {
                  occurrences++;
                  searchIdx += target_content.length;
                }
                if (occurrences === 0) {
                  return {
                    error: `Target content not found in ${file_path}. Your memory might be stale. Please re-read the file and try again.`
                  };
                }
                if (occurrences > 1) {
                  return {
                    error: `Target content found ${occurrences} times in ${file_path}. To avoid clobbering the wrong code, please provide a more unique 'target_content' by including surrounding lines.`
                  };
                }

                const updatedContent = currentContent.replace(target_content, replacement_content);
                await FileSystemService.saveFile(fullPath, updatedContent);
                return { success: true, file_path, content: updatedContent };
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

                // For simplicity in web mode, we just iterate through virtual FS
                // In Tauri mode, we could use native grep but for consistency:
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
      if (modelIdx < uniqueChain.length - 1) {
        console.warn(`Model ${uniqueChain[modelIdx]} failed to initialize, trying fallback...`);
        return getStreamResult(modelIdx + 1);
      }
      throw error;
    }
  };

  return await getStreamResult(0);
}
