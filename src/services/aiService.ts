import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createGateway } from '@ai-sdk/gateway';
import { streamText, tool } from 'ai';
import {
  SYSTEM_PROMPT,
  createArtifactTool,
  readFileTool,
  writeFileTool,
  editFileTool,
  writeToPlanTool,
} from './ai/config';
import { FileSystemService } from './FileSystemService';
import { isTauri } from '../lib/tauri';
import { API_KEYS, getModelDefinition } from '../config/models';

const safeJoin = async (base: string, segment: string): Promise<string> => {
  if (isTauri()) {
    const { join } = await import('@tauri-apps/api/path');
    return join(base, segment);
  }
  const sep = base.endsWith('/') || base.endsWith('\\') ? '' : '/';
  return base + sep + segment;
};

export function chatCompletion({
  messages,
  modelName,
  projectContext,
  projectPath,
  isThinkingEnabled,
}: {
  messages: any[];
  modelName: string;
  projectContext?: string;
  projectPath?: string;
  isThinkingEnabled?: boolean;
}) {
  const getApiKey = (key: string) => localStorage.getItem(key) || '';

  const providers = {
    google: createGoogleGenerativeAI({ apiKey: getApiKey(API_KEYS.google) }),
    groq: createGroq({ apiKey: getApiKey(API_KEYS.groq) }),
    mistral: createMistral({ apiKey: getApiKey(API_KEYS.mistral) }),
    openai: createOpenAI({ apiKey: getApiKey(API_KEYS.openai) }),
    openrouter: createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: getApiKey(API_KEYS.openrouter) }),
    cerebras: createOpenAI({ baseURL: 'https://api.cerebras.ai/v1', apiKey: getApiKey(API_KEYS.cerebras) }),
    opencodezen: createOpenAI({ baseURL: 'https://api.opencodezen.com/v1', apiKey: getApiKey(API_KEYS.opencodezen) }),
    github: createOpenAI({ baseURL: 'https://models.inference.ai.azure.com', apiKey: getApiKey(API_KEYS.github) }),
    cloudflare: createOpenAI({ baseURL: 'https://api.cloudflare.com/client/v4/accounts/default/ai/v1', apiKey: getApiKey(API_KEYS.cloudflare) }),
    cohere: createOpenAI({ baseURL: 'https://api.cohere.ai/v1', apiKey: getApiKey(API_KEYS.cohere) }),
    zai: createOpenAI({ baseURL: 'https://open.bigmodel.cn/api/paas/v4', apiKey: getApiKey(API_KEYS.zai) }),
    nvidia: createOpenAI({ baseURL: 'https://integrate.api.nvidia.com/v1', apiKey: getApiKey(API_KEYS.nvidia) }),
    huggingface: createOpenAI({ baseURL: 'https://api-inference.huggingface.co/v1', apiKey: getApiKey(API_KEYS.huggingface) }),
    ollama: createOpenAI({ baseURL: 'https://api.ollama.cloud/v1', apiKey: getApiKey(API_KEYS.ollama) }),
    kilo: createOpenAI({ baseURL: 'https://api.kilo.gateway.ai/v1', apiKey: getApiKey(API_KEYS.kilo) }),
    pollinations: createOpenAI({ baseURL: 'https://openai.pollinations.ai', apiKey: getApiKey(API_KEYS.pollinations) }),
    llm7: createOpenAI({ baseURL: 'https://api.llm7.ai/v1', apiKey: getApiKey(API_KEYS.llm7) }),
    ovh: createOpenAI({ baseURL: 'https://api.ovh.com/v1/ai/endpoints', apiKey: getApiKey(API_KEYS.ovh) }),
    reka: createOpenAI({ baseURL: 'https://api.reka.ai/v1', apiKey: getApiKey(API_KEYS.reka) }),
  };

  const gatewayUrl = getApiKey(API_KEYS.gateway);
  const gateway = gatewayUrl ? createGateway({ baseURL: gatewayUrl }) : null;

  const getLanguageModel = (name: string) => {
    const def = getModelDefinition(name);
    if (!def) return providers.google('gemini-3.5-flash');

    let model;
    if (def.provider === 'google') {
      model = providers.google(def.id);
    } else {
      const provider = providers[def.provider];
      model = provider ? provider(def.id) : providers.google('gemini-3.5-flash');
    }

    return gateway ? gateway(name) : model;
  };

  const fallbackChain = [
    modelName,
    'gemini-3.5-flash',
    'llama-3.1-8b-instant',
    'mistral-small-latest',
    'google/gemma-4-26b-a4b-it:free',
  ];

  const uniqueChain = Array.from(new Set(fallbackChain));

  const fullSystemPrompt = projectContext
    ? `${SYSTEM_PROMPT}\n\n### PROJECT CONTEXT\nBelow is the current file tree of the project:\n${projectContext}\n\nMaintain this structure when creating or updating files.`
    : SYSTEM_PROMPT;

  const normalizedMessages = messages
    .filter((m: any) => m.role !== 'system')
    .map((m: any) => {
      if (m.role === 'tool') return m;
      const role = m.role as 'user' | 'assistant';
      if (Array.isArray(m.parts) && m.parts.length > 0) {
        const text = m.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text ?? '')
          .join('');
        if (text) return { role, content: text };
      }
      return { role, content: m.content ?? '' };
    });

  const getStreamResult = (modelIdx: number): any => {
    const currentModelName = uniqueChain[modelIdx];
    const currentModel = getLanguageModel(currentModelName);
    const def = getModelDefinition(currentModelName);
    const shouldApplyThinking = isThinkingEnabled && def?.supportsThinking;

    let providerOptions: any = undefined;
    if (shouldApplyThinking) {
      providerOptions = {};
      if (def?.provider === 'google') {
        providerOptions.google = { thinkingConfig: { thinkingBudget: 1024 } };
      } else if (def?.provider === 'openai' || def?.provider === 'github') {
        providerOptions.openai = { reasoning: 'high' };
      }
    }

    try {
      return streamText({
        model: currentModel,
        system: fullSystemPrompt,
        messages: normalizedMessages,
        providerOptions,
        // @ts-expect-error - dynamic types
        maxSteps: 5,
        experimental_retry: { maxRetries: 1 },
        tools: {
          create_artifact: tool({
            description: createArtifactTool.description,
            parameters: createArtifactTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async (args: any) => ({ success: true, type: args.type, title: args.title, content: args.content }),
          }),
          read_file: tool({
            description: readFileTool.description,
            parameters: readFileTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({ file_path }: { file_path: string }) => {
              if (!projectPath) return { error: 'Not in project mode.' };
              try {
                const sanitizedPath = file_path.replace(/^(\.\.[\\/])+/, '');
                const fullPath = await safeJoin(projectPath, sanitizedPath);
                const content = await FileSystemService.getFileContent(fullPath);
                return { content, file_path };
              } catch (e: any) { return { error: `Failed to read: ${e.message || e}` }; }
            },
          }),
          write_file: tool({
            description: writeFileTool.description,
            parameters: writeFileTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({ file_path, content }: { file_path: string; content: string }) => {
              if (!projectPath) return { success: true, is_artifact: true, title: file_path, content };
              try {
                const sanitizedPath = file_path.replace(/^(\.\.[\\/])+/, '');
                const fullPath = await safeJoin(projectPath, sanitizedPath);
                await FileSystemService.saveFile(fullPath, content);
                return { success: true, file_path, content };
              } catch (e: any) { return { error: `Failed to write: ${e.message || e}` }; }
            },
          }),
          edit_file: tool({
            description: editFileTool.description,
            parameters: editFileTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({ file_path, target_content, replacement_content }: { file_path: string; target_content: string; replacement_content: string }) => {
              if (!projectPath) return { error: 'Not in project mode.' };
              try {
                const sanitizedPath = file_path.replace(/^(\.\.[\\/])+/, '');
                const fullPath = await safeJoin(projectPath, sanitizedPath);
                const currentContent = await FileSystemService.getFileContent(fullPath);
                if (!currentContent.includes(target_content)) return { error: `Target content not found in ${file_path}.` };
                const updatedContent = currentContent.replace(target_content, replacement_content);
                await FileSystemService.saveFile(fullPath, updatedContent);
                return { success: true, file_path, content: updatedContent };
              } catch (e: any) { return { error: `Failed to edit: ${e.message || e}` }; }
            },
          }),
          write_to_plan: tool({
            description: writeToPlanTool.description,
            parameters: writeToPlanTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({ filename, content }: { filename: string; content: string }) => {
              if (projectPath) {
                try {
                  const fullPath = await safeJoin(projectPath, filename);
                  await FileSystemService.saveFile(fullPath, content);
                  return { success: true, filename, content };
                } catch (e: any) { return { error: `Failed to write plan: ${e.message || e}` }; }
              }
              return { success: true, is_artifact: true, title: filename, content };
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

  return getStreamResult(0);
}
