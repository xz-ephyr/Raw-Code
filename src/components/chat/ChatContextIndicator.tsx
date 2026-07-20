import { getUsage } from "tokenlens"
import { Button } from "@/components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Progress } from "@/components/ui/progress"
import { useModelRegistry } from "@/contexts/ModelRegistryContext"

interface LanguageModelUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  reasoningTokens?: number
  cachedInputTokens?: number
}

const PERCENT_MAX = 100

interface ChatContextIndicatorProps {
  usedTokens: number
  modelId?: string
  usage?: LanguageModelUsage
}

export function ChatContextIndicator({ usedTokens, modelId, usage }: ChatContextIndicatorProps) {
  const { registry } = useModelRegistry()
  const entry = modelId ? registry.find(m => m.id === modelId) : undefined
  const maxTokens = entry?.limits?.context ?? 128_000

  const usedPercent = maxTokens > 0 ? usedTokens / maxTokens : 0
  const renderedPercent = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(usedPercent)

  const inputTokens = usage?.inputTokens ?? 0
  const outputTokens = usage?.outputTokens ?? 0
  const reasoningTokens = usage?.reasoningTokens ?? 0
  const cacheTokens = usage?.cachedInputTokens ?? 0

  const inputCost = modelId
    ? getUsage({ modelId, usage: { input: inputTokens, output: 0 } }).costUSD?.totalUSD
    : undefined
  const outputCost = modelId
    ? getUsage({ modelId, usage: { input: 0, output: outputTokens } }).costUSD?.totalUSD
    : undefined
  const reasoningCost = modelId
    ? getUsage({ modelId, usage: { reasoningTokens } }).costUSD?.totalUSD
    : undefined
  const cacheCost = modelId
    ? getUsage({ modelId, usage: { cacheReads: cacheTokens, input: 0, output: 0 } }).costUSD?.totalUSD
    : undefined

  const costUSD = modelId
    ? getUsage({
        modelId,
        usage: { input: inputTokens, output: outputTokens, reasoningTokens, cacheReads: cacheTokens },
      }).costUSD?.totalUSD
    : undefined
  const totalCost = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(costUSD ?? 0)

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { notation: "compact" }).format(n)

  return (
    <HoverCard closeDelay={0} openDelay={0}>
      <HoverCardTrigger asChild>
        <Button type="button" variant="ghost" className="p-1.5 h-auto gap-1.5 rounded-[6px] hover:bg-muted data-[state=open]:bg-muted">
          <span className="font-medium text-muted-foreground text-xs">{renderedPercent}</span>
          <div
            aria-label="Model context usage"
            role="img"
            className="relative size-4 shrink-0"
          >
            <div className="absolute inset-0 rounded-full border-2 border-gray-500/40 dark:border-gray-300/50" />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(hsl(var(--foreground)) ${usedPercent * 100}%, transparent ${usedPercent * 100}%)`,
                mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
              }}
            />
          </div>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-[129px] max-h-48 overflow-y-auto divide-y overflow-hidden p-0">
        <div className="w-full space-y-1.5 p-2">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <p>{renderedPercent}</p>
            <p className="font-mono text-muted-foreground">
              {fmt(usedTokens)} / {fmt(maxTokens)}
            </p>
          </div>
          <Progress className="bg-muted h-1.5" value={usedPercent * PERCENT_MAX} />
        </div>

        <div className="w-full p-2 space-y-0.5">
          {inputTokens > 0 && (
            <TokenRow label="Input" tokens={inputTokens} cost={inputCost} />
          )}
          {outputTokens > 0 && (
            <TokenRow label="Output" tokens={outputTokens} cost={outputCost} />
          )}
          {reasoningTokens > 0 && (
            <TokenRow label="Reasoning" tokens={reasoningTokens} cost={reasoningCost} />
          )}
          {cacheTokens > 0 && (
            <TokenRow label="Cache" tokens={cacheTokens} cost={cacheCost} />
          )}
          {!inputTokens && !outputTokens && !reasoningTokens && !cacheTokens && (
            <span className="text-[11px] text-muted-foreground">No usage data yet</span>
          )}
        </div>

        <div className="flex w-full items-center justify-between gap-2 bg-secondary px-2 py-1.5 text-[11px]">
          <span className="text-muted-foreground">Total cost</span>
          <span>{totalCost}</span>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

function TokenRow({ label, tokens, cost }: { label: string; tokens: number; cost?: number }) {
  const costText = cost !== undefined
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cost)
    : undefined
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span>
        {new Intl.NumberFormat("en-US", { notation: "compact" }).format(tokens)}
        {costText ? <span className="ml-1.5 text-muted-foreground">• {costText}</span> : null}
      </span>
    </div>
  )
}
