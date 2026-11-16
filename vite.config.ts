import { defineConfig } from 'vitest/config';

// L'interface de l'application vit dans app/ ; le moteur dans packages/core.
export default defineConfig({
  root: 'app',
  base: './',
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2022' },
  test: { root: '.', include: ['packages/**/*.test.ts'] },
});
