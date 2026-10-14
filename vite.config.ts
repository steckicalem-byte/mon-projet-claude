/// <reference types="vitest" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { proxyFootballData } from './server/footballData';
import { analyseMatch, type AiKeys } from './server/analysis';

/** Sert `/api/football` et `/api/analyse` en local (`npm run dev` / `npm run preview`), comme les fonctions Vercel. */
function footballApi(footballKey: string | undefined, aiKeys: AiKeys): Plugin {
  const handler = async (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let result;
    if (url.pathname === '/api/football') result = await proxyFootballData(url, footballKey);
    else if (url.pathname === '/api/analyse') result = await analyseMatch(url, footballKey, aiKeys);
    else return next();
    res.writeHead(result.status, result.headers);
    res.end(result.body);
  };
  return {
    name: 'football-api',
    configureServer: (server) => void server.middlewares.use(handler),
    configurePreviewServer: (server) => void server.middlewares.use(handler),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), footballApi(env.FOOTBALL_DATA_API_KEY, { anthropic: env.ANTHROPIC_API_KEY, gemini: env.GEMINI_API_KEY })],
    test: { include: ['src/**/*.test.ts', 'server/**/*.test.ts'] },
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
  };
});
