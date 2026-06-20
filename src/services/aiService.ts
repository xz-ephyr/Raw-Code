import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { convertToModelMessages, streamText, stepCountIs, tool } from 'ai';
import { SYSTEM_PROMPT, createArtifactTool, readFileTool, writeFileTool, editFileTool, writeToPlanTool, listDirTool, grepTool } from './ai/config';
import { FileSystemService } from './FileSystemService';
import { resolveProjectPath } from '../lib/projectPaths';
import { API_KEYS, getModelDefinition } from '../config/models';
let cachedProviders: any = null;
export function refreshProviders() { cachedProviders = null; }
function getProviders() {
  if (!cachedProviders) {
    cachedProviders = {
      google: createGoogleGenerativeAI({ apiKey: localStorage.getItem(API_KEYS.google) || '' }),
      groq: createGroq({ apiKey: localStorage.getItem(API_KEYS.groq) || '' }),
    };
  }
  return cachedProviders;
}
export function getAIErrorMessage(e: any) { return e?.message || String(e); }
export async function chatCompletion({ messages, modelName, projectContext, projectPath, isThinkingEnabled, abortSignal }: any) {
  const providers = getProviders();
  const getLanguageModel = (name: string) => {
    const def = getModelDefinition(name);
    if (!def) return providers.google('gemini-3.5-flash');
    return def.provider === 'google' ? providers.google(def.id) : providers.groq(def.id);
  };
  const fallbackChain = [modelName, 'gemini-3.5-flash', 'llama-3.1-8b-instant'];
  const uniqueChain = Array.from(new Set(fallbackChain));
  const fullSystemPrompt = projectContext ? `${SYSTEM_PROMPT}\n\n### PROJECT CONTEXT\n${projectContext}` : SYSTEM_PROMPT;
  const getStreamResult = async (idx: number): Promise<any> => {
    const currentModelName = uniqueChain[idx];
    const currentModel = getLanguageModel(currentModelName);
    const def = getModelDefinition(currentModelName);
    let providerOptions: any = undefined;
    if (isThinkingEnabled && def?.supportsThinking && def?.provider === 'google') {
      providerOptions = { google: { thinkingConfig: { thinkingBudget: 1024 } } };
    }
    try {
      const normalizedMessages = await convertToModelMessages(messages.filter((m: any) => m.role !== 'system'));
      return streamText({
        model: currentModel, system: fullSystemPrompt, messages: normalizedMessages, providerOptions, abortSignal, maxRetries: 2, stopWhen: stepCountIs(5),
        tools: {
          create_artifact: tool({ description: createArtifactTool.description, parameters: createArtifactTool.parameters, execute: async (args: any) => ({ success: true, ...args }) } as any),
          read_file: tool({ description: readFileTool.description, parameters: readFileTool.parameters, execute: async ({ file_path }: any) => {
            const fullPath = await resolveProjectPath(projectPath || '', file_path);
            return fullPath ? { content: await FileSystemService.getFileContent(fullPath), file_path } : { error: 'Path escape' };
          }} as any),
          write_file: tool({ description: writeFileTool.description, parameters: writeFileTool.parameters, execute: async ({ file_path, content }: any) => {
            if (!projectPath) return { success: true, is_artifact: true, title: file_path, content };
            const fullPath = await resolveProjectPath(projectPath, file_path);
            if (fullPath) { await FileSystemService.saveFile(fullPath, content); return { success: true, file_path, content }; }
            return { error: 'Path escape' };
          }} as any),
          edit_file: tool({ description: editFileTool.description, parameters: editFileTool.parameters, execute: async ({ file_path, target_content, replacement_content }: any) => {
            const fullPath = await resolveProjectPath(projectPath || '', file_path);
            if (!fullPath) return { error: 'Path escape' };
            const current = await FileSystemService.getFileContent(fullPath);
            const matches = current.split(target_content).length - 1;
            if (matches === 0) return { error: 'Not found' };
            const updated = current.replace(target_content, replacement_content);
            await FileSystemService.saveFile(fullPath, updated);
            return { success: true, file_path, content: updated, match_count: matches };
          }} as any),
          write_to_plan: tool({ description: writeToPlanTool.description, parameters: writeToPlanTool.parameters, execute: async ({ filename, content }: any) => {
            if (projectPath) {
              const fullPath = await resolveProjectPath(projectPath, filename);
              if (fullPath) { await FileSystemService.saveFile(fullPath, content); return { success: true, filename, content }; }
            }
            return { success: true, is_artifact: true, title: filename, content };
          }} as any),
          list_dir: tool({ description: listDirTool.description, parameters: listDirTool.parameters, execute: async ({ path }: any) => {
            const fullPath = await resolveProjectPath(projectPath || '', path);
            if (fullPath) {
              const tree = await FileSystemService.getTree(fullPath);
              return { path, entries: tree.map(e => ({ name: e.name, isDirectory: e.isDirectory })) };
            }
            return { error: 'Path escape' };
          }} as any),
          grep_tool: tool({ description: grepTool.description, parameters: grepTool.parameters, execute: async ({ pattern, path }: any) => {
            const fullPath = await resolveProjectPath(projectPath || '', path);
            if (!fullPath) return { error: 'Path escape' };
            const results: any[] = [];
            const tree = await FileSystemService.getTree(fullPath);
            const search = async (entries: any[]) => {
              for (const e of entries) {
                if (e.isDirectory) await search(e.children || []);
                else {
                  const content = await FileSystemService.getFileContent(e.path);
                  content.split('\n').forEach((line, i) => {
                    try {
                      if (new RegExp(pattern, 'i').test(line)) results.push({ file: e.path.replace(projectPath || '', '').replace(/^\//, ''), line: i + 1, content: line.trim() });
                    } catch (err) { /* invalid regex */ }
                  });
                }
              }
            };
            await search(tree);
            return { results: results.slice(0, 50) };
          }} as any),
        },
      });
    } catch (e) {
      if (idx < uniqueChain.length - 1) return getStreamResult(idx + 1);
      throw e;
    }
  };
  return await getStreamResult(0);
}
