import { z } from 'zod';
import type { ToolDef } from '@core/types';

export const checkUrlTool: ToolDef = {
  name: 'check_url',
  description: 'Check if a URL is reachable and return its status code, response time, and basic headers.',
  category: 'network',
  inputSchema: z.object({
    url: z.string().url().describe('The URL to check.'),
    timeout: z.number().optional().default(10000).describe('Timeout in milliseconds.'),
    followRedirects: z.boolean().optional().default(true).describe('Whether to follow redirects.'),
  }),
  execute: async ({ url, timeout, followRedirects }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const startTime = performance.now();

    try {
      const res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: followRedirects ? 'follow' : 'manual',
      });

      const elapsed = performance.now() - startTime;

      return {
        url,
        reachable: true,
        status: res.status,
        statusText: res.statusText,
        responseTimeMs: Math.round(elapsed),
        contentType: res.headers.get('content-type') || null,
        contentLength: res.headers.get('content-length') || null,
        lastModified: res.headers.get('last-modified') || null,
        redirected: res.redirected,
        finalUrl: res.url,
      };
    } catch (error: any) {
      const elapsed = performance.now() - startTime;
      if (error.name === 'AbortError') {
        return { url, reachable: false, error: `Timed out after ${timeout}ms`, responseTimeMs: Math.round(elapsed) };
      }
      return { url, reachable: false, error: error.message, responseTimeMs: Math.round(elapsed) };
    } finally {
      clearTimeout(timer);
    }
  },
};
