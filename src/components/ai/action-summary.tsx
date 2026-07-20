"use client"

import { useControllableState } from "@radix-ui/react-use-controllable-state"
import {
  ChevronDownIcon,
  SearchIcon,
  CheckIcon,
  Loader2Icon,
  AlertCircleIcon,
  FileTextIcon,
  GlobeIcon,
  WrenchIcon,
} from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { createContext, memo, useContext, useMemo, useState, useEffect } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface ActionItem {
  id: string
  type: "tool_call" | "search" | "fetch" | "thinking" | "custom"
  label: string
  description?: string
  status: "pending" | "active" | "complete" | "error"
  input?: unknown
  result?: unknown
  error?: string
  timestamp?: number
  duration?: number
}

interface ActionSummaryContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isStreaming: boolean
}

const ActionSummaryContext = createContext<ActionSummaryContextValue | null>(null)

const useActionSummary = () => {
  const context = useContext(ActionSummaryContext)
  if (!context) {
    throw new Error("ActionSummary components must be used within ActionSummary")
  }
  return context
}

export type ActionSummaryProps = ComponentProps<typeof Collapsible> & {
  summary?: string
  isStreaming?: boolean
  actions?: ActionItem[]
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  autoCollapseOnComplete?: boolean
}

export const ActionSummary = memo(
  ({
    className,
    summary,
    isStreaming = false,
    actions = [],
    open,
    defaultOpen = false,
    onOpenChange,
    autoCollapseOnComplete = true,
    children,
    ...props
  }: ActionSummaryProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    })

    const [hasCompleted, setHasCompleted] = useState(false)

    useEffect(() => {
      if (autoCollapseOnComplete && !isStreaming && actions.length > 0) {
        const allComplete = actions.every((a) => a.status === "complete" || a.status === "error")
        if (allComplete && !hasCompleted) {
          setHasCompleted(true)
        }
      }
    }, [isStreaming, actions, autoCollapseOnComplete, hasCompleted])

    const contextValue = useMemo(
      () => ({ isOpen, setIsOpen, isStreaming }),
      [isOpen, setIsOpen, isStreaming]
    )

    return (
      <ActionSummaryContext.Provider value={contextValue}>
        <Collapsible
          className={cn("not-prose mb-2", className)}
          onOpenChange={setIsOpen}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ActionSummaryContext.Provider>
    )
  }
)

export type ActionSummaryTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  getSummaryMessage?: (isStreaming: boolean, summary?: string, actionCount?: number) => ReactNode
}

const defaultGetSummaryMessage = (
  isStreaming: boolean,
  summary?: string,
  actionCount?: number
) => {
  if (isStreaming && summary) {
    return <span>{summary}</span>
  }
  if (isStreaming) {
    return <span className="writing-shimmer-text">thinking</span>
  }
  if (summary) {
    return <span>{summary}</span>
  }
  if (actionCount && actionCount > 0) {
    return <span>Completed {actionCount} action{actionCount > 1 ? "s" : ""}</span>
  }
  return <span>View actions</span>
}

export const ActionSummaryTrigger = memo(
  ({
    className,
    children,
    getSummaryMessage = defaultGetSummaryMessage,
    ...props
  }: ActionSummaryTriggerProps) => {
    const { isStreaming, isOpen } = useActionSummary()

    return (
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2 text-sm transition-colors",
          isStreaming
            ? "text-muted-foreground hover:text-foreground cursor-pointer"
            : "text-muted-foreground hover:text-foreground",
          isOpen && "text-foreground",
          className
        )}
        {...props}
      >
        <span className="inline-flex items-center gap-1.5 flex-1 text-left">
          {isStreaming && (
            <span className="inline-flex items-center justify-center size-4 text-sm leading-none">
              <StreamingSpinner />
            </span>
          )}
          <span className="truncate">
            {children ?? getSummaryMessage(isStreaming)}
          </span>
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 transition-transform",
            isOpen ? "rotate-180" : "rotate-0"
          )}
        />
      </CollapsibleTrigger>
    )
  }
)

export type ActionSummaryContentProps = ComponentProps<typeof CollapsibleContent>

export const ActionSummaryContent = memo(
  ({ className, children, ...props }: ActionSummaryContentProps) => (
    <CollapsibleContent
      className={cn(
        "mt-2 text-sm",
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
        className
      )}
      {...props}
    >
      {children}
    </CollapsibleContent>
  )
)

export type ActionTimelineProps = ComponentProps<"div"> & {
  actions: ActionItem[]
}

export const ActionTimeline = memo(
  ({ className, actions, ...props }: ActionTimelineProps) => {
    const sortedActions = useMemo(
      () => [...actions].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)),
      [actions]
    )

    return (
      <div className={cn("space-y-2", className)} {...props}>
        {sortedActions.map((action) => (
          <ActionTimelineItem key={action.id} action={action} />
        ))}
      </div>
    )
  }
)

export type ActionTimelineItemProps = ComponentProps<"div"> & {
  action: ActionItem
}

const actionIcons = {
  tool_call: WrenchIcon,
  search: SearchIcon,
  fetch: GlobeIcon,
  thinking: FileTextIcon,
  custom: FileTextIcon,
}

export const ActionTimelineItem = memo(
  ({ className, action, ...props }: ActionTimelineItemProps) => {
    const Icon = actionIcons[action.type] || FileTextIcon

    const statusIcon = useMemo(() => {
      switch (action.status) {
        case "active":
          return <Loader2Icon className="size-4 animate-spin text-blue-500" />
        case "complete":
          return <CheckIcon className="size-4 text-green-500" />
        case "error":
          return <AlertCircleIcon className="size-4 text-red-500" />
        default:
          return <Icon className="size-4 text-muted-foreground" />
      }
    }, [action.status, action.type])

    return (
      <div
        className={cn(
          "flex gap-2 text-sm",
          "fade-in-0 slide-in-from-top-2 animate-in",
          className
        )}
        {...props}
      >
        <div className="relative mt-0.5 shrink-0">{statusIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{action.label}</span>
            {action.duration !== undefined && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {action.duration}ms
              </Badge>
            )}
          </div>
          {action.description && (
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {action.description}
            </div>
          )}
          {action.error && (
            <div className="text-xs text-red-500 mt-0.5 truncate">
              {action.error}
            </div>
          )}
        </div>
      </div>
    )
  }
)

export type ActionDetailPanelProps = ComponentProps<"div"> & {
  action: ActionItem
}

export const ActionDetailPanel = memo(
  ({ className, action, ...props }: ActionDetailPanelProps) => {
    const [showInput, setShowInput] = useState(false)
    const [showResult, setShowResult] = useState(false)

    return (
      <div
        className={cn(
          "rounded-md border border-border bg-muted/30 p-2 text-xs",
          className
        )}
        {...props}
      >
        <div className="font-medium mb-1">{action.label}</div>
        {action.description && (
          <div className="text-muted-foreground mb-2">{action.description}</div>
        )}

        {action.input !== undefined && (
          <div className="mb-2">
            <button
              onClick={() => setShowInput(!showInput)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {showInput ? "Hide" : "Show"} input
            </button>
            {showInput && (
              <pre className="mt-1 p-2 rounded bg-muted overflow-x-auto text-xs">
                {typeof action.input === "string"
                  ? action.input
                  : JSON.stringify(action.input, null, 2)}
              </pre>
            )}
          </div>
        )}

        {action.result !== undefined && (
          <div>
            <button
              onClick={() => setShowResult(!showResult)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {showResult ? "Hide" : "Show"} result
            </button>
            {showResult && (
              <pre className="mt-1 p-2 rounded bg-muted overflow-x-auto text-xs max-h-48 overflow-y-auto">
                {typeof action.result === "string"
                  ? action.result
                  : JSON.stringify(action.result, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    )
  }
)

function StreamingSpinner() {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 4), 200)
    return () => clearInterval(id)
  }, [])
  return <>{['◐', '◓', '◑', '◒'][frame]}</>
}

ActionSummary.displayName = "ActionSummary"
ActionSummaryTrigger.displayName = "ActionSummaryTrigger"
ActionSummaryContent.displayName = "ActionSummaryContent"
ActionTimeline.displayName = "ActionTimeline"
ActionTimelineItem.displayName = "ActionTimelineItem"
ActionDetailPanel.displayName = "ActionDetailPanel"
