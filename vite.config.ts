import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const CHUNK_GROUPS = [
  { name: 'effect', test: /[\\/]node_modules[\\/](effect|@effect[\\/])/ },
  { name: 'codemirror', test: /[\\/]node_modules[\\/]@(codemirror|uiw)[\\/]/ },
  { name: 'markdown', test: /[\\/]node_modules[\\/](react-markdown|remark-|rehype-|unified|mdast|hast)[\\/]/ },
  { name: 'mermaid', test: /[\\/]node_modules[\\/](mermaid|dagre|d3)[\\/]/ },
  { name: 'babel', test: /[\\/]node_modules[\\/]@babel[\\/]/ },
  { name: 'xlsx', test: /[\\/]node_modules[\\/]xlsx[\\/]/ },
  { name: 'hugeicons', test: /[\\/]node_modules[\\/]@hugeicons[\\/]/ },
  { name: 'ai-sdk', test: /[\\/]node_modules[\\/]@ai-sdk[\\/]/ },
];

export default defineConfig({
  plugins: [react()],
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
  server: {
    port: 4028,
    strictPort: true,
    proxy: {
      '/proxy': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/dok-tor/**'],
    },
  },
  optimizeDeps: {
    exclude: ['dok-tor'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          for (const group of CHUNK_GROUPS) {
            if (group.test.test(id)) return group.name;
          }
        },
      },
    },
  },
});
