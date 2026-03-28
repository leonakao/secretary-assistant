import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const API_PROXY_TARGET =
  process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:3000';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    alias: {
      '~': '/app',
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'app/**/*.test.ts',
      'app/**/*.test.tsx',
      'tests/**/*.test.ts',
    ],
    setupFiles: ['app/test/setup.ts'],
  },
});
