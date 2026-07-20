import { MODEL_REGISTRY_FALLBACK } from '@doktor/llm-providers/model-catalog'
import { loadModelRegistry } from '@doktor/llm-providers/model-catalog'

export type Provider = string;

export interface ModelDefinition {
  id: string;
  provider: Provider;
  label: string;
  supportsThinking?: boolean;
  cliId?: string;
  maxInputTokens?: number;
}

export const MODELS: ModelDefinition[] = MODEL_REGISTRY_FALLBACK.map(m => ({
  id: m.id,
  provider: m.provider,
  label: m.label,
  supportsThinking: m.supportsThinking,
  maxInputTokens: m.limits?.context,
}))

const CLI_MODELS: ModelDefinition[] = [];
let _liveModels: ModelDefinition[] | null = null;

export async function ensureModelsLoaded(): Promise<ModelDefinition[]> {
  if (!_liveModels) {
    const registry = await loadModelRegistry()
    _liveModels = registry.map(m => ({
      id: m.id,
      provider: m.provider,
      label: m.label,
      supportsThinking: m.supportsThinking,
      maxInputTokens: m.limits?.context,
    }))
  }
  return _liveModels
}

export type AIModel = string;

const FALLBACK_MODEL_IDS = new Set(MODELS.map(m => m.id))

export const DEFAULT_MODEL: AIModel = 'mistral-small-latest';

export const SELECTED_MODEL_STORAGE_KEY = 'selected-model';

function isAIModel(model: string | null): model is AIModel {
  if (!model) return false
  if (FALLBACK_MODEL_IDS.has(model)) return true
  if (_liveModels) return _liveModels.some(m => m.id === model)
  return false
}

export function getStoredSelectedModel(): AIModel {
  const storedModel = localStorage.getItem(SELECTED_MODEL_STORAGE_KEY);
  return storedModel && isAIModel(storedModel) ? storedModel : DEFAULT_MODEL;
}

export function getModelForChatRequest(_sessionId: string | undefined, _projectId?: string): AIModel {
  return getStoredSelectedModel();
}

export function getModelDefinition(modelId: string): ModelDefinition | undefined {
  if (_liveModels) {
    const found = _liveModels.find(m => m.id === modelId)
    if (found) return found
  }
  return MODELS.find(m => m.id === modelId) || CLI_MODELS.find(m => m.id === modelId);
}
