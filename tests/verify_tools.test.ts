import { describe, it, expect, vi } from 'vitest';
import { callGoTool } from '../src/services/tools/goProxy';

// Mock fetch for proxy testing
global.fetch = vi.fn();

describe('Go Tool Proxy', () => {
  it('should delegate tool calls to the Go agent', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        result: { content: 'hello world' },
        error: null,
        durationMs: 5
      })
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await callGoTool('read_file', { path: '/test.txt' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tools/execute'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ tool: 'read_file', params: { path: '/test.txt' } })
      })
    );
    expect(result.content).toBe('hello world');
  });

  it('should throw error when Go agent returns error', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        result: null,
        error: 'file not found',
        durationMs: 2
      })
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    await expect(callGoTool('read_file', { path: '/missing.txt' }))
      .rejects.toThrow('file not found');
  });
});
