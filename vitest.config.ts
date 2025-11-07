import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.spec.ts'],
    root: './',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.spec.ts',
        '**/*.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  // eslint-disable-next-line
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
