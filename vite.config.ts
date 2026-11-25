import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// The PWA service worker caches every same-origin GET. A worker left behind on
// localhost by an earlier run would serve stale dev modules, or another
// project's that later ran on the same port. In dev, /sw.js is replaced by a
// worker that clears ProgDealer's caches, unregisters itself and reloads the
// page. The browser fetches /sw.js past the old worker on every navigation,
// so this heals any browser that still has one.
const DEV_SW_KILL_SWITCH = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('progdealer-')) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
  })());
});
`;

function devServiceWorkerKillSwitch(): Plugin {
  return {
    name: 'dev-sw-kill-switch',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/sw.js', (_req, res) => {
        res.setHeader('Content-Type', 'text/javascript');
        res.setHeader('Cache-Control', 'no-store');
        res.end(DEV_SW_KILL_SWITCH);
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devServiceWorkerKillSwitch()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173,
    host: true
  }
});