import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@backend': fileURLToPath(new URL('./backend', import.meta.url)),
      '@desktop-contracts': fileURLToPath(new URL('./contracts', import.meta.url)),
      '@infrastructure': fileURLToPath(new URL('./infrastructure', import.meta.url)),
      '@ipc': fileURLToPath(new URL('./ipc', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['electron/**/*.spec.ts'],
  },
});
