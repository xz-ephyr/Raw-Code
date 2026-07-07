import { z } from 'zod';
import type { ToolDef } from '@core/types';

export const checkUrlTool: ToolDef = {
  name: 'check_url',
  description: 'Check if a URL is reachable (returns status code, response time, headers). Lightweight HEAD request — use this for health checks, link verification, or before making a full http_request. Does NOT fetch page content — use http_request or fetch_page for that.',
  category: 'network',
  inputSchema: z.object({
    url: z.string().url().describe('The URL to check (must include https:// or http://).'),
    timeout: z.number().optional().default(10000).describe('Timeout in milliseconds. Default 10000 (10s).'),
    followRedirects: z.boolean().optional().default(true).describe('Follow HTTP redirects. Default true. Set false to see the redirect chain.'),
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
