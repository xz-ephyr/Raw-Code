import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callGoTool } from '../src/services/tools/goProxy';

// Mock fetch for proxy testing
global.fetch = vi.fn();

describe('Go Tool Proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('should retry idempotent calls on transient failure', async () => {
    const mockSuccess = {
      ok: true,
      json: () => Promise.resolve({
        result: { content: 'recovered' },
        error: null,
        durationMs: 5
      })
    };
    const mockFailure = {
      ok: false,
      statusText: 'Service Unavailable'
    };

    // First call fails, second succeeds
    (global.fetch as any)
      .mockResolvedValueOnce(mockFailure)
      .mockResolvedValueOnce(mockSuccess);

    const result = await callGoTool('read_file', { path: '/retry.txt' });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.content).toBe('recovered');
  });

  it('should NOT retry non-idempotent calls', async () => {
    const mockFailure = {
      ok: false,
      statusText: 'Service Unavailable'
    };

    (global.fetch as any).mockResolvedValue(mockFailure);

    await expect(callGoTool('run_command', { command: 'rm -rf /' }, { idempotent: false }))
      .rejects.toThrow('Service Unavailable');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
