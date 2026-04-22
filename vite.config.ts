import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { IncomingMessage, ServerResponse } from 'node:http';

function coorApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'coor-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/coordinator', async (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }

        // Inject env vars for the handler
        process.env.SUPABASE_URL       = env.SUPABASE_URL;
        process.env.SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

        try {
          const { initCoordinator, handleGet, handlePost } = await import('./api/_coor_handler');
          initCoordinator();

          let result: unknown;

          if (req.method === 'GET') {
            const url = new URL(req.url!, 'http://localhost');
            result = await handleGet(url.searchParams);
          } else if (req.method === 'POST') {
            const body: Record<string, unknown> = await new Promise((resolve, reject) => {
              let raw = '';
              req.on('data', c => raw += c);
              req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { reject(new Error('JSON inválido')); } });
              req.on('error', reject);
            });
            result = await handlePost(body);
          } else {
            res.statusCode = 405;
            res.end(JSON.stringify({ message: 'Método no permitido' }));
            return;
          }

          res.statusCode = 200;
          res.end(JSON.stringify(result));
        } catch (err) {
          console.error('[coor-api]', err);
          res.statusCode = (err as { statusCode?: number }).statusCode ?? 500;
          res.end(JSON.stringify({ message: err instanceof Error ? err.message : 'Error interno' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      coorApiPlugin(env),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'Coordinador',
          short_name: 'Coordinador',
          description: 'Panel de coordinadores de sala',
          start_url: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#0F1419',
          background_color: '#0F1419',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        },
      }),
    ],
    server: {
      port: 5175,
    },
  };
});
