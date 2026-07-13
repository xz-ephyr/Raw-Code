import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './core'),
      '@doktor/tool-runtime': path.resolve(__dirname, './packages/tool-runtime/src'),
      '@doktor/subagent': path.resolve(__dirname, './packages/subagent/src'),
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
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
