import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadModelRegistry, MODEL_REGISTRY_FALLBACK } from '@doktor/llm-providers/model-catalog';
import type { ModelRegistryEntry } from '@doktor/llm-providers/model-registry';

interface ModelRegistryState {
  registry: ModelRegistryEntry[];
  loading: boolean;
}

const ModelRegistryContext = createContext<ModelRegistryState>({
  registry: MODEL_REGISTRY_FALLBACK,
  loading: true,
});

export function ModelRegistryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModelRegistryState>({
    registry: MODEL_REGISTRY_FALLBACK,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    loadModelRegistry().then(
      registry => {
        if (!cancelled) setState({ registry, loading: false });
      },
      () => {
        if (!cancelled) setState(s => ({ ...s, loading: false }));
      }
    );
    return () => { cancelled = true; };
  }, []);

  return (
    <ModelRegistryContext.Provider value={state}>
      {children}
    </ModelRegistryContext.Provider>
  );
}

export function useModelRegistry() {
  return useContext(ModelRegistryContext);
}
