import { describe, it, expect } from 'vitest';
import { cleanReasoning, hasPartialArtifact, extractThinkTags, mapUIMessageToLegacyMessage } from '../src/lib/chatUtils';

describe('cleanReasoning', () => {
  it('strips artifact metadata lines', () => {
    const input = `some reasoning
* Type: \`code\`
* Identifier: \`foo\`
* Title: \`bar\`
more reasoning`;
    expect(cleanReasoning(input)).toBe('some reasoning\nmore reasoning');
  });

  it('strips artifact inline format', () => {
    const input = `\`identifier\`: \`abc\` * \`type\`: \`code\` * \`title\`: \`test\``;
    expect(cleanReasoning(input)).toBe('');
  });

  it('preserves non-artifact inline text', () => {
    const input = `text \`identifier\`: \`abc\` * \`type\`: \`code\` * \`title\`: \`test\` more`;
    expect(cleanReasoning(input)).toBe(input.trim());
  });

  it('strips search result headers', () => {
    const input = 'some text\nResults:\ncontent\nSearch results 2:\nmore';
    expect(cleanReasoning(input)).toBe('some textcontentmore');
  });

  it('strips URLs in bullet lists', () => {
    const input = 'text\n- https://example.com\n- http://test.com/path\nend';
    expect(cleanReasoning(input)).toBe('text\nend');
  });

  it('strips numbered reference URLs', () => {
    const input = 'text\n1. [title](https://example.com)\n[1]: https://example.com\nend';
    expect(cleanReasoning(input)).toBe('text\nend');
  });

  it('preserves bare URLs (only strips structured reference formats)', () => {
    const input = 'visit https://example.com/page for more';
    expect(cleanReasoning(input)).toBe(input.trim());
  });

  it('strips meta-cognition lines about tool calls', () => {
    const input = 'reasoning\nI am struggling with the tool call\nmore reasoning';
    expect(cleanReasoning(input)).toBe('reasoning\n\nmore reasoning');
  });

  it('strips explicit failure loops, not normal planning statements', () => {
    const input = 'some text\nI am struggling with the same error repeatedly\nend';
    expect(cleanReasoning(input)).toBe('some text\n\nend');
  });

  it('preserves normal retry/planning statements as legitimate reasoning', () => {
    const input = 'some text\nLet me try again with a different approach\nend';
    expect(cleanReasoning(input)).toBe(input.trim());
  });

  it('collapses excessive newlines', () => {
    const input = 'a\n\n\n\n\nb';
    expect(cleanReasoning(input)).toBe('a\n\nb');
  });

  it('trims whitespace', () => {
    expect(cleanReasoning('  hello  ')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(cleanReasoning('')).toBe('');
  });

  it('handles mixed artifacts and preserves inline URLs', () => {
    const input = `thinking about solution
* Type: \`code\`
look at https://example.com for reference
done`;
    expect(cleanReasoning(input)).toBe('thinking about solution\nlook at https://example.com for reference\ndone');
  });
});

describe('hasPartialArtifact', () => {
  it('returns true when content contains antArtifact tag', () => {
    expect(hasPartialArtifact('<antArtifact>code</antArtifact>')).toBe(true);
  });

  it('returns true for incomplete antArtifact tag', () => {
    expect(hasPartialArtifact('<antArtifact type="code">')).toBe(true);
  });

  it('returns false when no antArtifact tag', () => {
    expect(hasPartialArtifact('just some text')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasPartialArtifact('')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(hasPartialArtifact('<ANTARTIFACT>')).toBe(true);
    expect(hasPartialArtifact('<antartifact>')).toBe(true);
  });
});

describe('extractThinkTags', () => {
  it('extracts complete think tags', () => {
    const result = extractThinkTags('before<think>inner thought</think>after');
    expect(result.cleanContent).toBe('beforeafter');
    expect(result.thinking).toBe('inner thought');
  });

  it('extracts incomplete (unclosed) think tag', () => {
    const result = extractThinkTags('text<think>unfinished thought');
    expect(result.cleanContent).toBe('text');
    expect(result.thinking).toBe('unfinished thought');
  });

  it('handles multiple think tags', () => {
    const result = extractThinkTags('a<think>first</think>b<think>second</think>c');
    expect(result.cleanContent).toBe('abc');
    expect(result.thinking).toBe('first\nsecond');
  });

  it('handles empty think tags', () => {
    const result = extractThinkTags('text<think></think>more');
    expect(result.cleanContent).toBe('textmore');
    expect(result.thinking).toBe('');
  });

  it('trims think content', () => {
    const result = extractThinkTags('<think>  spaced  </think>');
    expect(result.thinking).toBe('spaced');
  });

  it('returns original content when no think tags', () => {
    const result = extractThinkTags('plain text');
    expect(result.cleanContent).toBe('plain text');
    expect(result.thinking).toBe('');
  });

  it('handles think tags with newlines', () => {
    const result = extractThinkTags('a<think>\nline1\nline2\n</think>b');
    expect(result.cleanContent).toBe('ab');
    expect(result.thinking).toBe('line1\nline2');
  });

  it('extracts both complete and incomplete think tags', () => {
    const result = extractThinkTags('<think>done</think><think>unfinished');
    expect(result.cleanContent).toBe('');
    expect(result.thinking).toBe('done\nunfinished');
  });
});

describe('mapUIMessageToLegacyMessage', () => {
  it('returns null for null input', () => {
    expect(mapUIMessageToLegacyMessage(null)).toBeNull();
  });

  it('returns undefined for undefined input', () => {
    expect(mapUIMessageToLegacyMessage(undefined)).toBeUndefined();
  });

  it('extracts content from parts when missing', () => {
    const msg = { parts: [{ type: 'text', text: 'hello' }, { type: 'text', text: ' world' }] };
    const result = mapUIMessageToLegacyMessage(msg);
    expect(result.content).toBe('hello world');
  });

  it('extracts reasoning from parts when missing', () => {
    const msg = { parts: [{ type: 'reasoning', reasoning: 'deep thought' }] };
    const result = mapUIMessageToLegacyMessage(msg);
    expect(result.reasoning).toBe('deep thought');
  });

  it('strips reasoning that leaked into content', () => {
    const reasoning = 'my reasoning text';
    const content = `prefix ${reasoning} suffix`;
    const msg = { content, reasoning };
    const result = mapUIMessageToLegacyMessage(msg);
    expect(result.content).toBe('prefix  suffix');
  });

  it('extracts think tags from content', () => {
    const msg = { content: 'visible<think>hidden</think>text' };
    const result = mapUIMessageToLegacyMessage(msg);
    expect(result.content).toBe('visibletext');
    expect(result.reasoning).toBe('hidden');
  });

  it('extracts toolInvocations from parts', () => {
    const msg = {
      parts: [{
        type: 'dynamic-tool',
        toolName: 'search',
        toolCallId: 'call-1',
        input: { query: 'test' },
        state: 'output-available',
      }],
    };
    const result = mapUIMessageToLegacyMessage(msg);
    expect(result.toolInvocations).toHaveLength(1);
    expect(result.toolInvocations[0].toolName).toBe('search');
    expect(result.toolInvocations[0].state).toBe('result');
  });

  it('extracts artifacts from writeArtifact tool calls', () => {
    const msg = {
      toolInvocations: [{
        toolName: 'writeArtifact',
        args: { identifier: 'id-1', type: 'code', content: 'const x = 1;', title: 'test' },
      }],
    };
    const result = mapUIMessageToLegacyMessage(msg);
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].identifier).toBe('id-1');
    expect(result.artifacts[0].content).toBe('const x = 1;');
  });

  it('extracts all writeArtifact calls, not just the first', () => {
    const msg = {
      toolInvocations: [
        {
          toolName: 'writeArtifact',
          args: { identifier: 'file-a', type: 'code', content: 'const a = 1;', title: 'File A' },
        },
        {
          toolName: 'writeArtifact',
          args: { identifier: 'file-b', type: 'code', content: 'const b = 2;', title: 'File B' },
        },
      ],
    };
    const result = mapUIMessageToLegacyMessage(msg);
    expect(result.artifacts).toHaveLength(2);
    expect(result.artifacts[0].identifier).toBe('file-a');
    expect(result.artifacts[1].identifier).toBe('file-b');
  });

  it('parses antArtifact tags when no writeArtifact tool', () => {
    const msg = { content: 'some text\n<antArtifact identifier="a1" type="code" title="Test">code here</antArtifact>' };
    const result = mapUIMessageToLegacyMessage(msg);
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].identifier).toBe('a1');
  });

  it('splits content around writeArtifact tool call', () => {
    const msg = {
      toolInvocations: [{ toolName: 'writeArtifact', args: { identifier: 'i1', content: 'x' } }],
      parts: [
        { type: 'text', text: 'before ' },
        { type: 'dynamic-tool', toolName: 'writeArtifact', toolCallId: 'c1' },
        { type: 'text', text: 'after' },
      ],
    };
    const result = mapUIMessageToLegacyMessage(msg);
    expect(result.contentBeforeTool).toBe('before');
    expect(result.contentAfterTool).toBe('after');
  });

  it('sets hasPartialArtifact flag', () => {
    const msg = { content: '<antArtifact>' };
    const result = mapUIMessageToLegacyMessage(msg);
    expect(result.hasPartialArtifact).toBe(true);
  });

  it('preserves original properties', () => {
    const msg = { id: 'msg-1', role: 'assistant', content: 'hi' };
    const result = mapUIMessageToLegacyMessage(msg);
    expect(result.id).toBe('msg-1');
    expect(result.role).toBe('assistant');
  });
});
