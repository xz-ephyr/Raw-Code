import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { GlobeIcon, ArrowDown01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'
import { MODELS } from '@core/config/models'
import { getProviderLabel } from '@core/providers'
import { ModelIcon } from './ModelIcon'
import { Dropdown } from './Dropdown'

interface DefaultModelSelectorProps {
  selectedModel: string
  onChange: (modelId: string) => void
  maxHeight?: string
}

export function DefaultModelSelector({ selectedModel, onChange, maxHeight = '190px' }: DefaultModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const def = MODELS.find(m => m.id === selectedModel)

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
        <HugeiconsIcon icon={GlobeIcon} size={16} />
        Default Model
      </label>
      <div className="relative">
        <div
          className="h-10 bg-muted rounded-[10px] px-3 text-sm outline-none w-full border border-border flex items-center cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="flex-1 truncate">
            {def ? `${def.label} (${getProviderLabel(def.provider) || def.provider})` : selectedModel}
          </span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={16} className="text-muted-foreground shrink-0" />
        </div>
        <Dropdown
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          width="100%"
          maxHeight={maxHeight}
          className="mt-1"
        >
          {MODELS.map((model, idx) => (
            <button
              key={`${model.id}-${idx}`}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2 ${
                selectedModel === model.id ? 'bg-muted font-medium' : ''
              }`}
              onClick={() => {
                onChange(model.id)
                setIsOpen(false)
              }}
            >
              <ModelIcon modelId={model.id} size={14} />
              <span className="flex-1 truncate">{model.label}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">{getProviderLabel(model.provider) || model.provider}</span>
              {model.supportsThinking && (
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-blue-500 shrink-0 ml-auto" />
              )}
            </button>
          ))}
        </Dropdown>
      </div>
    </div>
  )
}
