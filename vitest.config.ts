import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['server/src/**/*.ts', 'core/**/*.ts'],
      exclude: ['server/src/**/index.ts', 'core/**/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './core'),
      '@doktor/tool-runtime': path.resolve(__dirname, './packages/tool-runtime/src'),
      '@doktor/subagent': path.resolve(__dirname, './packages/subagent/src'),
      '@doktor/llm-providers': path.resolve(__dirname, './packages/llm-providers/src'),
      '@doktor/schema': path.resolve(__dirname, './packages/schema/src'),
      '@doktor/effect-drizzle-sqlite': path.resolve(__dirname, './packages/effect-drizzle-sqlite/src'),
      '@doktor/effect-sqlite-node': path.resolve(__dirname, './packages/effect-sqlite-node/src'),
    },
  },
});
