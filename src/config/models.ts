export const AI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemma-4-31b-it',
  'gemma-4-26b-a4b-it',
] as const;

export type AIModel = (typeof AI_MODELS)[number];

export const DEFAULT_MODEL: AIModel = AI_MODELS[0];

export const MODEL_MODES = {
  fixed: 'fixed',
  rotate: 'rotate',
} as const;

export type ModelMode = (typeof MODEL_MODES)[keyof typeof MODEL_MODES];

export const MODEL_MODE_STORAGE_KEY = 'model-mode';
export const SELECTED_MODEL_STORAGE_KEY = 'selected-model';

export function isAIModel(model: string | null): model is AIModel {
  return AI_MODELS.includes(model as AIModel);
}

export function isModelMode(mode: string | null): mode is ModelMode {
  return mode === MODEL_MODES.fixed || mode === MODEL_MODES.rotate;
}

export function getStoredSelectedModel(): AIModel {
  const storedModel = localStorage.getItem(SELECTED_MODEL_STORAGE_KEY);
  return isAIModel(storedModel) ? storedModel : DEFAULT_MODEL;
}

export function getStoredModelMode(): ModelMode {
  const storedMode = localStorage.getItem(MODEL_MODE_STORAGE_KEY);
  return isModelMode(storedMode) ? storedMode : MODEL_MODES.fixed;
}

export function getModelRotationStorageKey(sessionId: string | undefined): string {
  return `model-rotation-index-${sessionId || 'new'}`;
}

export function getNextRotatingModel(sessionId: string | undefined): AIModel {
  const storageKey = getModelRotationStorageKey(sessionId);
  const storedIndex = Number.parseInt(localStorage.getItem(storageKey) || '0', 10);
  const currentIndex = Number.isNaN(storedIndex) ? 0 : storedIndex % AI_MODELS.length;
  const nextIndex = (currentIndex + 1) % AI_MODELS.length;

  localStorage.setItem(storageKey, nextIndex.toString());

  return AI_MODELS[currentIndex];
}

export function getModelForChatRequest(sessionId: string | undefined): AIModel {
  return getStoredModelMode() === MODEL_MODES.rotate ? getNextRotatingModel(sessionId) : getStoredSelectedModel();
}
