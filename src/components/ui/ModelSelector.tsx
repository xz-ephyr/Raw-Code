import { type ComponentProps, type ReactNode, useState, useMemo } from "react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useModelRegistry } from "@/contexts/ModelRegistryContext"
import { PROVIDER_CONFIGS, getAllProviderIds } from "@doktor/llm-providers/model-registry"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

export type ModelSelectorProps = ComponentProps<typeof Dialog>

export const ModelSelector = (props: ModelSelectorProps) => <Dialog {...props} />

export type ModelSelectorTriggerProps = ComponentProps<typeof DialogTrigger>

export const ModelSelectorTrigger = (props: ModelSelectorTriggerProps) => <DialogTrigger {...props} />

export type ModelSelectorContentProps = ComponentProps<typeof DialogContent> & {
  title?: ReactNode
}

export const ModelSelectorContent = ({
  className,
  children,
  title = "Model Selector",
  ...props
}: ModelSelectorContentProps) => (
  <DialogContent className={cn("p-0", className)} {...props}>
    <DialogTitle className="sr-only">{title}</DialogTitle>
    <Command className="**:data-[slot=command-input-wrapper]:h-auto">{children}</Command>
  </DialogContent>
)

export type ModelSelectorDialogProps = ComponentProps<typeof CommandDialog>

export const ModelSelectorDialog = (props: ModelSelectorDialogProps) => <CommandDialog {...props} />

export type ModelSelectorInputProps = ComponentProps<typeof CommandInput>

export const ModelSelectorInput = ({ className, ...props }: ModelSelectorInputProps) => (
  <CommandInput className={cn("h-auto py-3.5", className)} {...props} />
)

export type ModelSelectorListProps = ComponentProps<typeof CommandList>

export const ModelSelectorList = (props: ModelSelectorListProps) => <CommandList {...props} />

export type ModelSelectorEmptyProps = ComponentProps<typeof CommandEmpty>

export const ModelSelectorEmpty = (props: ModelSelectorEmptyProps) => <CommandEmpty {...props} />

export type ModelSelectorGroupProps = ComponentProps<typeof CommandGroup>

export const ModelSelectorGroup = (props: ModelSelectorGroupProps) => <CommandGroup {...props} />

export type ModelSelectorItemProps = ComponentProps<typeof CommandItem>

export const ModelSelectorItem = (props: ModelSelectorItemProps) => <CommandItem {...props} />

export type ModelSelectorShortcutProps = ComponentProps<typeof CommandShortcut>

export const ModelSelectorShortcut = (props: ModelSelectorShortcutProps) => <CommandShortcut {...props} />

export type ModelSelectorSeparatorProps = ComponentProps<typeof CommandSeparator>

export const ModelSelectorSeparator = (props: ModelSelectorSeparatorProps) => <CommandSeparator {...props} />

export type ModelSelectorLogoProps = Omit<ComponentProps<"img">, "src" | "alt"> & {
  provider: string
}

export const ModelSelectorLogo = ({ provider, className, ...props }: ModelSelectorLogoProps) => (
  <img
    {...props}
    alt={`${provider} logo`}
    className={cn("size-3 dark:invert", className)}
    height={12}
    src={`https://models.dev/logos/${provider}.svg`}
    width={12}
  />
)

export type ModelSelectorLogoGroupProps = ComponentProps<"div">

export const ModelSelectorLogoGroup = ({ className, ...props }: ModelSelectorLogoGroupProps) => (
  <div
    className={cn(
      "-space-x-1 flex shrink-0 items-center [&>img]:rounded-full [&>img]:bg-background [&>img]:p-px [&>img]:ring-1 dark:[&>img]:bg-foreground",
      className,
    )}
    {...props}
  />
)

export type ModelSelectorNameProps = ComponentProps<"span">

export const ModelSelectorName = ({ className, ...props }: ModelSelectorNameProps) => (
  <span className={cn("flex-1 truncate text-left", className)} {...props} />
)

export type ModelSelectorChefProps = ComponentProps<"span">

export const ModelSelectorChef = ({ className, ...props }: ModelSelectorChefProps) => (
  <span className={cn("text-xs text-muted-foreground", className)} {...props} />
)

export function ModelSelectorDropdown({ currentModel }: { currentModel: string }) {
  const [open, setOpen] = useState(false)
  const { registry } = useModelRegistry()

  const selectedEntry = currentModel ? registry.find(m => m.id === currentModel) : undefined

  const providerOrder = useMemo(() => getAllProviderIds(), [])

  const chefs = useMemo(() => {
    const seen = new Set<string>()
    const order: string[] = []
    for (const providerId of providerOrder) {
      const label = PROVIDER_CONFIGS[providerId]?.label ?? providerId
      if (!seen.has(label)) {
        seen.add(label)
        order.push(label)
      }
    }
    return order
  }, [providerOrder])

  const modelsByChef = useMemo(() => {
    const map = new Map<string, typeof registry>()
    for (const m of registry) {
      const label = PROVIDER_CONFIGS[m.provider]?.label ?? m.provider
      const group = map.get(label)
      if (group) group.push(m)
      else map.set(label, [m])
    }
    return map
  }, [registry])

  const handleSelect = (modelId: string) => {
    try {
      localStorage.setItem("selected-model", modelId)
    } catch {}
    window.dispatchEvent(new CustomEvent("model-changed"))
    setOpen(false)
  }

  const modelToDisplay = selectedEntry || registry[0]
  if (!modelToDisplay) return null

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs"
            >
          <ModelSelectorLogo provider={modelToDisplay.provider} />
          <span className="max-w-[100px] truncate">{modelToDisplay.label}</span>
          <ChevronDownIcon className="size-3 opacity-50" />
        </button>
          </TooltipTrigger>
          <TooltipContent>Select model</TooltipContent>
        </Tooltip>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          {chefs.map(chef => (
            <ModelSelectorGroup heading={chef} key={chef}>
              {(modelsByChef.get(chef) || []).map(model => (
                <ModelSelectorItem
                  key={model.id}
                  onSelect={() => handleSelect(model.id)}
                  value={model.id}
                >
                  <ModelSelectorLogo provider={model.provider} />
                  <ModelSelectorName>{model.label}</ModelSelectorName>
                  <ModelSelectorLogoGroup>
                    <ModelSelectorLogo provider={model.provider} />
                  </ModelSelectorLogoGroup>
                  {selectedEntry?.id === model.id ? (
                    <CheckIcon className="ml-auto size-4" />
                  ) : (
                    <div className="ml-auto size-4" />
                  )}
                </ModelSelectorItem>
              ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  )
}
