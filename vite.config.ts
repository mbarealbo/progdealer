import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: './index.html'
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
