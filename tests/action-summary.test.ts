/**
 * ActionSummary Feature Test
 *
 * Tests the full ActionSummary pipeline:
 * 1. Reducer generates actionSummary from tool calls
 * 2. Summary text is generated correctly
 * 3. Actions are tracked with proper status
 * 4. Component renders correctly
 *
 * Run: npx vitest run tests/action-summary.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  reduceEvent,
  createEmptyState,
} from '@/lib/llmEventReducer'
import type { LLMEvent } from '@doktor/llm-providers'

// Helper to create properly typed events
function textDelta(text: string): LLMEvent {
  return { type: 'text-delta', text } as LLMEvent
}

function textStart(): LLMEvent {
  return { type: 'text-start', id: 'text_1' } as LLMEvent
}

function toolCall(id: string, name: string, input: unknown): LLMEvent {
  return { type: 'tool-call', id, name, input } as LLMEvent
}

function toolResult(id: string, result: unknown): LLMEvent {
  return { type: 'tool-result', id, result } as LLMEvent
}

function toolError(id: string, message: string): LLMEvent {
  return { type: 'tool-error', id, message } as LLMEvent
}

function finish(reason: string = 'stop'): LLMEvent {
  return { type: 'finish', reason } as LLMEvent
}

function stepFinish(): LLMEvent {
  return { type: 'step-finish' } as LLMEvent
}

describe('ActionSummary - Reducer Logic', () => {
  describe('text-start creates initial actionSummary', () => {
    it('creates actionSummary when text streaming starts', () => {
      const state = createEmptyState()
      const event = textStart()

      const next = reduceEvent(state, event)

      expect(next.currentMessage).not.toBeNull()
      expect(next.currentMessage?.actionSummary).toBeDefined()
      expect(next.currentMessage?.actionSummary?.summary).toBe('Processing your request...')
      expect(next.currentMessage?.actionSummary?.actions).toEqual([])
    })
  })

  describe('text-delta does not rebuild actionSummary', () => {
    it('preserves existing actionSummary during text streaming', () => {
      const state = createEmptyState()
      // First, start text streaming (sets initial actionSummary)
      let next = reduceEvent(state, textStart())

      expect(next.currentMessage?.actionSummary).toBeDefined()

      // Then, text-delta should NOT change the actionSummary
      next = reduceEvent(next, textDelta('Hello world'))

      // actionSummary should still be "Processing your request..." from text-start
      // since text-delta no longer rebuilds it
      expect(next.currentMessage?.actionSummary?.summary).toBe('Processing your request...')
      expect(next.currentMessage?.actionSummary?.actions).toEqual([])
    })
  })

  describe('step-finish updates actionSummary', () => {
    it('updates actionSummary with final content on step-finish', () => {
      const state = createEmptyState()
      let next = reduceEvent(state, textStart())
      next = reduceEvent(next, textDelta('Final content after research'))
      next = reduceEvent(next, stepFinish())

      expect(next.currentMessage?.actionSummary).toBeDefined()
      expect(next.currentMessage?.actionSummary?.summary).toBe('Final content after research')
    })
  })

  describe('tool-call generates summary from tool', () => {
    it('creates actionSummary for research tool', () => {
      const state = createEmptyState()
      state.currentMessage = {
        id: 'test',
        role: 'assistant',
        content: '',
        reasoning: '',
        toolCalls: [],
        createdAt: Date.now(),
      }

      const event = toolCall('call_1', 'research', { query: 'AI news 2026', depth: 'deep', maxSources: 8 })

      const next = reduceEvent(state, event)

      expect(next.currentMessage?.actionSummary).toBeDefined()
      expect(next.currentMessage?.actionSummary?.summary).toBe('Searching for "AI news 2026"')
      expect(next.currentMessage?.actionSummary?.actions).toHaveLength(1)
      expect(next.currentMessage?.actionSummary?.actions[0].type).toBe('search')
      expect(next.currentMessage?.actionSummary?.actions[0].label).toBe('research')
      expect(next.currentMessage?.actionSummary?.actions[0].description).toBe('AI news 2026')
    })

    it('creates actionSummary for write_artifact tool', () => {
      const state = createEmptyState()
      state.currentMessage = {
        id: 'test',
        role: 'assistant',
        content: '',
        reasoning: '',
        toolCalls: [],
        createdAt: Date.now(),
      }

      const event = toolCall('call_2', 'write_artifact', { title: 'My Article', content: '...' })

      const next = reduceEvent(state, event)

      expect(next.currentMessage?.actionSummary?.summary).toBe('Writing "My Article"')
      expect(next.currentMessage?.actionSummary?.actions[0].type).toBe('tool_call')
    })

    it('creates actionSummary for web_search tool', () => {
      const state = createEmptyState()
      state.currentMessage = {
        id: 'test',
        role: 'assistant',
        content: '',
        reasoning: '',
        toolCalls: [],
        createdAt: Date.now(),
      }

      const event = toolCall('call_3', 'web_search', { query: 'climate change data' })

      const next = reduceEvent(state, event)

      expect(next.currentMessage?.actionSummary?.summary).toBe('Searching for "climate change data"')
      expect(next.currentMessage?.actionSummary?.actions[0].type).toBe('search')
    })

    it('creates actionSummary for edit_text tool', () => {
      const state = createEmptyState()
      state.currentMessage = {
        id: 'test',
        role: 'assistant',
        content: '',
        reasoning: '',
        toolCalls: [],
        createdAt: Date.now(),
      }

      const event = toolCall('call_4', 'edit_text', { instruction: 'Fix grammar' })

      const next = reduceEvent(state, event)

      expect(next.currentMessage?.actionSummary?.summary).toBe('Editing text...')
    })

    it('creates actionSummary for unknown tool', () => {
      const state = createEmptyState()
      state.currentMessage = {
        id: 'test',
        role: 'assistant',
        content: '',
        reasoning: '',
        toolCalls: [],
        createdAt: Date.now(),
      }

      const event = toolCall('call_5', 'custom_tool', {})

      const next = reduceEvent(state, event)

      expect(next.currentMessage?.actionSummary?.summary).toBe('Running custom_tool...')
    })
  })

  describe('tool-result updates action status', () => {
    it('marks action as complete when result arrives', () => {
      const state = createEmptyState()
      state.currentMessage = {
        id: 'test',
        role: 'assistant',
        content: '',
        reasoning: '',
        toolCalls: [
          { id: 'call_1', name: 'research', input: { query: 'test' }, status: 'streaming' },
        ],
        createdAt: Date.now(),
      }

      const event = toolResult('call_1', { sources: [] })

      const next = reduceEvent(state, event)

      expect(next.currentMessage?.actionSummary?.actions[0].status).toBe('complete')
      expect(next.currentMessage?.actionSummary?.actions[0].result).toEqual({ sources: [] })
    })
  })

  describe('tool-error marks action as error', () => {
    it('marks action as error when error occurs', () => {
      const state = createEmptyState()
      state.currentMessage = {
        id: 'test',
        role: 'assistant',
        content: '',
        reasoning: '',
        toolCalls: [
          { id: 'call_1', name: 'research', input: { query: 'test' }, status: 'streaming' },
        ],
        createdAt: Date.now(),
      }

      const event = toolError('call_1', 'API rate limit exceeded')

      const next = reduceEvent(state, event)

      expect(next.currentMessage?.actionSummary?.actions[0].status).toBe('error')
      expect(next.currentMessage?.actionSummary?.actions[0].error).toBe('API rate limit exceeded')
    })
  })

  describe('multiple tool calls tracking', () => {
    it('tracks multiple actions in sequence', () => {
      let state = createEmptyState()

      // First tool call
      state = reduceEvent(state, toolCall('call_1', 'research', { query: 'first query' }))

      expect(state.currentMessage?.actionSummary?.actions).toHaveLength(1)

      // Second tool call
      state = reduceEvent(state, toolCall('call_2', 'web_search', { query: 'second query' }))

      expect(state.currentMessage?.actionSummary?.actions).toHaveLength(2)
      expect(state.currentMessage?.actionSummary?.actions[0].label).toBe('research')
      expect(state.currentMessage?.actionSummary?.actions[1].label).toBe('web_search')

      // Complete first tool
      state = reduceEvent(state, toolResult('call_1', { sources: [] }))

      expect(state.currentMessage?.actionSummary?.actions[0].status).toBe('complete')
      expect(state.currentMessage?.actionSummary?.actions[1].status).toBe('active')
    })
  })

  describe('content priority over tool summary', () => {
    it('uses content summary in step-finish update', () => {
      const state = createEmptyState()
      state.currentMessage = {
        id: 'test',
        role: 'assistant',
        content: 'Here is what I found about the topic...',
        reasoning: '',
        toolCalls: [
          { id: 'call_1', name: 'research', input: { query: 'test' }, status: 'streaming' },
        ],
        createdAt: Date.now(),
      }

      // step-finish rebuilds actionSummary with content taking priority
      const next = reduceEvent(state, stepFinish())

      expect(next.currentMessage?.actionSummary).toBeDefined()
      expect(next.currentMessage?.actionSummary?.summary).toBe('Here is what I found about the topic')
    })
  })

  describe('no actionSummary when empty', () => {
    it('returns actionSummary with processing message when streaming starts', () => {
      const state = createEmptyState()
      const event = textStart()

      const next = reduceEvent(state, event)

      // Now actionSummary is always created when streaming starts
      expect(next.currentMessage?.actionSummary).toBeDefined()
      expect(next.currentMessage?.actionSummary?.summary).toBe('Processing your request...')
      expect(next.currentMessage?.actionSummary?.actions).toEqual([])
    })

    it('returns undefined actionSummary when not streaming and no content/tools', () => {
      const state = createEmptyState()
      // Simulate a non-streaming state with no content
      state.currentMessage = {
        id: 'test',
        role: 'assistant',
        content: '',
        reasoning: '',
        toolCalls: [],
        createdAt: Date.now(),
      }
      state.status = 'idle'

      // Create a custom event that won't trigger streaming
      const event = { type: 'text-end' } as LLMEvent

      const next = reduceEvent(state, event)

      // actionSummary should remain whatever it was before
      expect(next.currentMessage?.actionSummary).toBeUndefined()
    })
  })

  describe('finish preserves actionSummary', () => {
    it('keeps actionSummary after finish event', () => {
      const state = createEmptyState()
      state.currentMessage = {
        id: 'test',
        role: 'assistant',
        content: 'Final answer',
        reasoning: '',
        toolCalls: [
          { id: 'call_1', name: 'research', input: { query: 'test' }, status: 'complete' },
        ],
        actionSummary: {
          summary: 'Searching for "test"',
          actions: [{ id: 'call_1', type: 'search', label: 'research', status: 'complete' }],
        },
        createdAt: Date.now(),
      }
      state.status = 'streaming'

      const event = finish()

      const next = reduceEvent(state, event)

      expect(next.messages).toHaveLength(1)
      expect(next.messages[0].actionSummary).toBeDefined()
      expect(next.messages[0].actionSummary?.summary).toBe('Searching for "test"')
    })
  })
})

describe('ActionSummary - Summary Generation', () => {
  describe('research tool summary', () => {
    it('includes query in summary', () => {
      const state = createEmptyState()
      state.currentMessage = {
        id: 'test',
        role: 'assistant',
        content: '',
        reasoning: '',
        toolCalls: [],
        createdAt: Date.now(),
      }

      const next = reduceEvent(state, toolCall('call_1', 'research', { query: 'impact of AI on healthcare' }))

      expect(next.currentMessage?.actionSummary?.summary).toBe(
        'Searching for "impact of AI on healthcare"'
      )
    })

    it('handles missing query gracefully', () => {
      const state = createEmptyState()
      state.currentMessage = {
        id: 'test',
        role: 'assistant',
        content: '',
        reasoning: '',
        toolCalls: [],
        createdAt: Date.now(),
      }

      const next = reduceEvent(state, toolCall('call_1', 'research', {}))

      expect(next.currentMessage?.actionSummary?.summary).toBe('Searching the web...')
    })
  })

  describe('write tool summary', () => {
    it('includes title in summary', () => {
      const state = createEmptyState()
      state.currentMessage = {
        id: 'test',
        role: 'assistant',
        content: '',
        reasoning: '',
        toolCalls: [],
        createdAt: Date.now(),
      }

      const next = reduceEvent(state, toolCall('call_1', 'write_article', { title: 'Deep Learning Guide' }))

      expect(next.currentMessage?.actionSummary?.summary).toBe('Writing "Deep Learning Guide"')
    })
  })
})

describe('ActionSummary - Action Item Structure', () => {
  it('creates proper action item structure', () => {
    const state = createEmptyState()
    state.currentMessage = {
      id: 'test',
      role: 'assistant',
      content: '',
      reasoning: '',
      toolCalls: [],
      createdAt: Date.now(),
    }

    const next = reduceEvent(state, toolCall('call_1', 'research', { query: 'test query', depth: 'deep', maxSources: 10 }))

    const action = next.currentMessage?.actionSummary?.actions[0]

    expect(action).toEqual({
      id: 'call_1',
      type: 'search',
      label: 'research',
      description: 'test query',
      status: 'active',
      input: { query: 'test query', depth: 'deep', maxSources: 10 },
      result: undefined,
      error: undefined,
    })
  })

  it('maps tool types correctly', () => {
    const state = createEmptyState()
    state.currentMessage = {
      id: 'test',
      role: 'assistant',
      content: '',
      reasoning: '',
      toolCalls: [],
      createdAt: Date.now(),
    }

    // Search tools
    const searchTools = ['research', 'web_search']
    for (const toolName of searchTools) {
      const next = reduceEvent(state, toolCall(`call_${toolName}`, toolName, { query: 'test' }))
      expect(next.currentMessage?.actionSummary?.actions[0].type).toBe('search')
    }

    // Tool call tools
    const callTools = ['write_artifact', 'write_article', 'edit_text', 'custom_tool']
    for (const toolName of callTools) {
      const next = reduceEvent(state, toolCall(`call_${toolName}`, toolName, {}))
      expect(next.currentMessage?.actionSummary?.actions[0].type).toBe('tool_call')
    }
  })
})
