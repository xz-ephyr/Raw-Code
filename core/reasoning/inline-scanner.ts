import type { LLMEvent } from "@doktor/llm-providers"

export interface TagDef {
  open: string
  close: string
}

export interface InlineScannerState {
  fullText: string
  lastPos: number
  inTag: boolean
  hasEmittedStart: boolean
}

export function createInlineScanner() {
  const state: InlineScannerState = {
    fullText: "",
    lastPos: 0,
    inTag: false,
    hasEmittedStart: false,
  }

  function feed(text: string, tags: TagDef[]): { content: string; reasoning: string; events: LLMEvent[] } {
    state.fullText += text
    const events: LLMEvent[] = []
    let contentDelta = ""
    let reasoningDelta = ""
    let pos = state.lastPos

    while (pos < state.fullText.length) {
      if (state.inTag) {
        const closeTag = tags.find(t => state.fullText.startsWith(t.close, pos))
        if (closeTag) {
          const seg = state.fullText.slice(state.lastPos, pos).trim()
          if (seg) {
            if (!state.hasEmittedStart) {
              events.push({ type: "reasoning-start", id: "tagged" } as any)
              state.hasEmittedStart = true
            }
            events.push({ type: "reasoning-delta", id: "tagged", text: seg } as any)
            reasoningDelta += (reasoningDelta ? "\n\n" : "") + seg
            events.push({ type: "reasoning-end", id: "tagged" } as any)
          }
          pos += closeTag.close.length
          state.lastPos = pos
          state.inTag = false
          state.hasEmittedStart = false
        } else {
          pos++
        }
      } else {
        const openTag = tags.find(t => state.fullText.startsWith(t.open, pos))
        if (openTag) {
          const before = state.fullText.slice(state.lastPos, pos)
          contentDelta += before
          pos += openTag.open.length
          state.lastPos = pos
          state.inTag = true
          state.hasEmittedStart = false
        } else {
          pos++
        }
      }
    }

    // If we ended mid-content, check if the end of unprocessed text is a partial tag open
    if (!state.inTag && state.lastPos < state.fullText.length) {
      const tail = state.fullText.slice(state.lastPos)
      let partialLen = 0
      for (const tag of tags) {
        for (let i = tag.open.length - 1; i >= 1; i--) {
          if (tail.length >= i && tag.open.slice(0, i) === tail.slice(-i)) {
            if (i > partialLen) partialLen = i
          }
        }
      }
      if (partialLen > 0) {
        const safeEnd = state.fullText.length - partialLen
        if (safeEnd > state.lastPos) {
          contentDelta += state.fullText.slice(state.lastPos, safeEnd)
        }
        state.lastPos = safeEnd
      } else {
        contentDelta += tail
        state.lastPos = state.fullText.length
      }
    }

    return { content: contentDelta, reasoning: reasoningDelta, events }
  }

  return { state, feed }
}

export function flushInlineScanner(
  scanner: ReturnType<typeof createInlineScanner>,
): { content: string; reasoning: string; events: LLMEvent[] } {
  const { state } = scanner
  const events: LLMEvent[] = []
  let content = ""
  let reasoning = ""

  if (state.inTag) {
    const seg = state.fullText.slice(state.lastPos).trim()
    if (seg) {
      if (!state.hasEmittedStart) {
        events.push({ type: "reasoning-start", id: "tagged" } as any)
      }
      events.push({ type: "reasoning-delta", id: "tagged", text: seg } as any)
      reasoning = seg
      events.push({ type: "reasoning-end", id: "tagged" } as any)
    }
    state.inTag = false
    state.hasEmittedStart = false
  }

  return { content, reasoning, events }
}
