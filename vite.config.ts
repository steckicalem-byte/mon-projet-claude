import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Mode « artifact » : un seul bundle, destiné à être intégré dans un fichier HTML unique.
  base: mode === 'artifact' ? './' : '/',
  build: {
    outDir: mode === 'artifact' ? 'dist-single' : 'dist',
    rollupOptions: {
      output:
        mode === 'artifact'
          ? { inlineDynamicImports: true }
          : { manualChunks: { charts: ['recharts'], vendor: ['react', 'react-dom', 'react-router-dom'] } },
    },
  },
}));
