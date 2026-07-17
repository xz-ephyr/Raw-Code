import { describe, it, expect } from 'vitest'
import { getModelCapability, MODEL_CAPABILITIES } from '@core/reasoning/capabilities'
import { createInlineScanner, flushInlineScanner } from '@core/reasoning/inline-scanner'
import type { TagDef } from '@core/reasoning/inline-scanner'

describe('STEP 6 — Reasoning leak detection', () => {
  // ── Leak check helper ──
  function checkLeak(content: string, reasoning: string) {
    if (content && reasoning) {
      expect(content).not.toContain(reasoning)
      expect(reasoning).not.toContain(content)
    }
  }

  // ── Inline scanner tests ──
  describe('Inline tag scanner (chunk-boundary safe)', () => {
    const tags: TagDef[] = [{ open: '<think>', close: '</think>' }]

    it('extracts complete tag in single chunk', () => {
      const scanner = createInlineScanner()
      const r1 = scanner.feed('Hello <think>I think deeply</think> World', tags)
      expect(r1.content).toBe('Hello  World')
      expect(r1.reasoning).toBe('I think deeply')
      expect(r1.events.filter(e => e.type === 'reasoning-start')).toHaveLength(1)
      expect(r1.events.filter(e => e.type === 'reasoning-delta')).toHaveLength(1)
      checkLeak(r1.content, r1.reasoning)
    })

    it('handles tag split across two chunks', () => {
      const scanner = createInlineScanner()
      const r1 = scanner.feed('Hello <thi', tags)
      expect(r1.content).toBe('Hello ')
      expect(r1.reasoning).toBe('')
      expect(r1.events).toHaveLength(0)

      const r2 = scanner.feed('nk>I think</think> World', tags)
      expect(r2.content).toBe(' World')
      expect(r2.reasoning).toBe('I think')
      expect(r2.events.filter(e => e.type === 'reasoning-start')).toHaveLength(1)
      expect(r2.events.filter(e => e.type === 'reasoning-delta')).toHaveLength(1)
      checkLeak(r2.content, r2.reasoning)
    })

    it('handles content across three chunks', () => {
      const scanner = createInlineScanner()
      scanner.feed('Hello <thi', tags)
      scanner.feed('nk>Step 1: anal', tags)
      const r3 = scanner.feed('yze\nStep 2: solve</think> Done', tags)
      expect(r3.content).toBe(' Done')
      expect(r3.reasoning).toContain('Step 1')
      expect(r3.reasoning).toContain('Step 2')
      checkLeak(r3.content, r3.reasoning)
    })

    it('handles multiple tag occurrences', () => {
      const scanner = createInlineScanner()
      const r1 = scanner.feed('<think>First</think> middle <think>Second</think> end', tags)
      expect(r1.content).toBe(' middle  end')
      expect(r1.reasoning).toContain('First')
      expect(r1.reasoning).toContain('Second')
      checkLeak(r1.content, r1.reasoning)
    })

    it('flushes unclosed tag at end of stream', () => {
      const scanner = createInlineScanner()
      scanner.feed('Hello <think>I was thinking', tags)
      const flushed = flushInlineScanner(scanner)
      expect(flushed.reasoning).toBe('I was thinking')
      expect(flushed.events.filter(e => e.type === 'reasoning-delta')).toHaveLength(1)
      expect(flushed.events.filter(e => e.type === 'reasoning-end')).toHaveLength(1)
    })
  })

  // ── Tag format support ──
  describe('Multiple tag formats', () => {
    const formats: { name: string; tags: TagDef[]; text: string; expectedReasoning: string }[] = [
      { name: '<think>', tags: [{ open: '<think>', close: '</think>' }], text: 'A <think>deep thought</think> B', expectedReasoning: 'deep thought' },
      { name: '<thought>', tags: [{ open: '<thought>', close: '</thought>' }], text: 'A <thought>gemma thought</thought> B', expectedReasoning: 'gemma thought' },
      { name: '<reasoning>', tags: [{ open: '<reasoning>', close: '</reasoning>' }], text: 'A <reasoning>chain</reasoning> B', expectedReasoning: 'chain' },
      { name: '```thinking', tags: [{ open: '```thinking\n', close: '```' }], text: 'A ```thinking\ncode think\n``` B', expectedReasoning: 'code think' },
      { name: '```reasoning', tags: [{ open: '```reasoning\n', close: '```' }], text: 'A ```reasoning\nr\n``` B', expectedReasoning: 'r' },
      { name: '[think]', tags: [{ open: '[think]', close: '[/think]' }], text: 'A [think]bracket[/think] B', expectedReasoning: 'bracket' },
      { name: '[reasoning]', tags: [{ open: '[reasoning]', close: '[/reasoning]' }], text: 'A [reasoning]r[/reasoning] B', expectedReasoning: 'r' },
    ]

    for (const fmt of formats) {
      it(`extracts ${fmt.name} tags`, () => {
        const scanner = createInlineScanner()
        const r = scanner.feed(fmt.text, fmt.tags)
        expect(r.reasoning).toBe(fmt.expectedReasoning)
        expect(r.content).not.toContain(fmt.expectedReasoning)
        checkLeak(r.content, r.reasoning)
      })
    }
  })

  // ── Capability manifest completeness ──
  describe('Model capability manifest', () => {
    const entries = Object.entries(MODEL_CAPABILITIES)

    it('covers all patterns with a mechanism', () => {
      for (const [, cap] of entries) {
        expect(cap.mechanism).toBeDefined()
        expect(['none', 'native', 'tagged']).toContain(cap.reasoning)
      }
    })

    it('tagged models have inline_tags mechanism with open/close', () => {
      for (const [, cap] of entries) {
        if (cap.reasoning === 'tagged') {
          expect(cap.mechanism.type).toBe('inline_tags')
          expect(cap.mechanism.open).toBeDefined()
          expect(cap.mechanism.close).toBeDefined()
        }
      }
    })

    it('native models have reasoning_content or thinking_delta mechanism', () => {
      for (const [, cap] of entries) {
        if (cap.reasoning === 'native') {
          expect(['reasoning_content', 'thinking_delta']).toContain(cap.mechanism.type)
        }
      }
    })
  })

  // ── getModelCapability fallback ──
  describe('getModelCapability fallback', () => {
    it('returns none for unknown models', () => {
      const cap = getModelCapability('nonexistent-model-v42')
      expect(cap.reasoning).toBe('none')
      expect(cap.mechanism.type).toBe('none')
    })

    it('matches by substring pattern', () => {
      const cap = getModelCapability('deepseek-reasoner-v2')
      expect(cap.reasoning).toBe('native')
    })
  })
})
