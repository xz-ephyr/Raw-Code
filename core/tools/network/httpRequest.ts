import { z } from 'zod';
import type { ToolDef } from '@core/types';

export const httpRequestTool: ToolDef = {
  name: 'http_request',
  description: 'Make an HTTP request to an external API or URL. Supports GET, POST, PUT, PATCH, DELETE methods.',
  category: 'network',
  inputSchema: z.object({
    url: z.string().url().describe('The full URL to send the request to.'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional().default('GET').describe('HTTP method.'),
    headers: z.record(z.string()).optional().describe('Optional HTTP headers as key-value pairs.'),
    body: z.string().optional().describe('Request body as a string (JSON, text, etc.). Automatically sets Content-Type for JSON.'),
    timeout: z.number().optional().default(15000).describe('Timeout in milliseconds.'),
  }),
  execute: async ({ url, method, headers, body, timeout }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const reqHeaders: Record<string, string> = { ...headers };
      if (body && !reqHeaders['Content-Type']) {
        try {
          JSON.parse(body);
          reqHeaders['Content-Type'] = 'application/json';
        } catch {
          reqHeaders['Content-Type'] = 'text/plain';
        }
      }

      const res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: body || undefined,
        signal: controller.signal,
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      return {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw new Error(`HTTP request failed: ${error.message}`);
    } finally {
      clearTimeout(timer);
    }
  },
};
