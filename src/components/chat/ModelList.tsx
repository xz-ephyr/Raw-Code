import { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Search, Settings2 } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { useModelRegistry } from '@/contexts/ModelRegistryContext';
import { getProviderLabel } from '@core/providers';
import { ModelIcon } from '@/components/ui/ModelIcon';
import { Dropdown } from '@/components/ui/Dropdown';
import { SELECTED_MODEL_STORAGE_KEY, getModelDefinition } from '@core/config/models';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const ENABLED_MODELS_KEY = 'raw_code_enabled_models';

function loadEnabledModels(): string[] | null {
  try {
    const raw = localStorage.getItem(ENABLED_MODELS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveEnabledModels(ids: string[]) {
  localStorage.setItem(ENABLED_MODELS_KEY, JSON.stringify(ids));
}

interface ModelListProps {
  currentModel?: string;
  showThinkingOnly?: boolean;
  isIdle?: boolean;
}

export default function ModelList({ currentModel, showThinkingOnly, isIdle }: ModelListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [search, setSearch] = useState('');
  const [enabledModels, setEnabledModelsState] = useState<string[] | null>(loadEnabledModels());
  const { registry } = useModelRegistry();

  useEffect(() => {
    if (showManage) {
      setSearch('');
    }
  }, [showManage]);

  const resolvedModel = currentModel && currentModel !== 'auto' ? currentModel : (registry.length > 0 ? registry[0].id : '');
  const currentDef = resolvedModel ? (registry.find(m => m.id === resolvedModel) || getModelDefinition(resolvedModel)) : undefined;

  const isModelEnabled = useCallback((id: string) => {
    if (enabledModels === null) return true;
    return enabledModels.includes(id);
  }, [enabledModels]);

  const handleToggle = useCallback((modelId: string) => {
    setEnabledModelsState(prev => {
      const current = prev ?? registry.map(m => m.id);
      const next = current.includes(modelId)
        ? current.filter(id => id !== modelId)
        : [...current, modelId];
      saveEnabledModels(next);
      return next;
    });
  }, [registry]);

  const handleSelect = useCallback((modelId: string) => {
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, modelId);
    window.dispatchEvent(new CustomEvent('model-changed'));
    setIsOpen(false);
  }, []);

  const filteredModels = showThinkingOnly
    ? registry.filter(m => m.supportsThinking && isModelEnabled(m.id))
    : registry.filter(m => isModelEnabled(m.id));

  const grouped = useMemo(() => {
    const map = new Map<string, typeof registry>();
    for (const m of filteredModels) {
      if (m.id.startsWith('auto/') || m.id === 'auto') continue;
      const key = m.provider;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [filteredModels]);

  const manageGrouped = useMemo(() => {
    const map = new Map<string, typeof registry>();
    for (const m of registry) {
      if (m.id.startsWith('auto/') || m.id === 'auto') continue;
      const key = m.provider;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [registry]);

  const manageFiltered = useMemo(() => {
    if (!search) return manageGrouped;
    const q = search.toLowerCase();
    return manageGrouped
      .map(([provider, models]) => [
        provider,
        models.filter(m => m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q)),
      ] as const)
      .filter(([, models]) => models.length > 0);
  }, [manageGrouped, search]);

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs"
          >
        <ModelIcon modelId={resolvedModel || 'default'} size={18} />
        <span className="max-w-[100px] truncate">{resolvedModel ? (currentDef?.label || resolvedModel) : 'Default'}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
      </button>
        </TooltipTrigger>
        <TooltipContent>Select model</TooltipContent>
      </Tooltip>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position={isIdle ? 'bottom' : 'top'}
        align="right"
        width="280px"
        maxHeight="260px"
      >
        <div className="border-b border-border mb-1 pb-1">
          <button
            type="button"
            onClick={() => { setIsOpen(false); setShowManage(true); }}
            className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md flex items-center gap-2 transition-colors"
          >
            <Settings2 size={13} />
            <span>Manage models...</span>
          </button>
        </div>
        {grouped.map(([providerId, models]) => (
          <div key={providerId}>
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {getProviderLabel(providerId)}
            </div>
            {models.map(m => {
              const isSelected = m.id === resolvedModel;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m.id)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2 rounded-md ${
                    isSelected
                      ? 'text-foreground bg-muted'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <ModelIcon modelId={m.id} size={16} />
                  <span className="flex-1 truncate">{m.label}</span>
                  {m.supportsThinking && (
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} className="text-blue-500 shrink-0" />
                  )}
                  {isSelected && (
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} className="text-green-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </Dropdown>

      {showManage && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[100] p-4 sm:p-6"
          onClick={() => setShowManage(false)}
        >
          <div
            className="relative bg-card rounded-2xl w-[650px] max-w-[650px] h-[500px] shadow-2xl shadow-black/50 border border-border flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowManage(false)}
              className="absolute right-4 top-4 z-10 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
              <Search size={16} className="text-muted-foreground/50 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 py-1"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-3">
              {manageFiltered.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">No models found</div>
              )}
              {manageFiltered.map(([providerId, models]) => (
                <div key={providerId} className="mb-2">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {getProviderLabel(providerId)}
                  </div>
                  {models.map(m => {
                    const enabled = isModelEnabled(m.id);
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          m.id === resolvedModel
                            ? 'bg-muted text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <ModelIcon modelId={m.id} size={18} />
                        <span className="flex-1 truncate">{m.label}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          onClick={() => handleToggle(m.id)}
                          className="group relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <span className={`absolute inset-0 rounded-full transition-all duration-300 ease-out ${
                            enabled
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-900 shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]'
                              : 'bg-neutral-200 dark:bg-neutral-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]'
                          }`} />
                          <span className={`pointer-events-none relative inline-block h-[20px] w-[20px] rounded-full bg-white transition-all duration-300 ease-out mt-[2px] ${
                            enabled
                              ? 'translate-x-[18px] shadow-[0_2px_8px_rgba(37,99,235,0.4)] group-hover:shadow-[0_2px_12px_rgba(37,99,235,0.6)]'
                              : 'translate-x-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.1)] group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                          }`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
