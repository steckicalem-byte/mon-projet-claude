import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { proxyFootballData } from './server/footballData';

/** Sert `/api/football` en local (`npm run dev` / `npm run preview`), comme la fonction Vercel. */
function footballApi(apiKey: string | undefined): Plugin {
  const handler = async (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next: () => void) => {
    if (!req.url?.startsWith('/api/football')) return next();
    const result = await proxyFootballData(new URL(req.url, 'http://localhost'), apiKey);
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
    plugins: [react(), footballApi(env.FOOTBALL_DATA_API_KEY)],
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
