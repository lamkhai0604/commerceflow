/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Same-origin API in development: the Spring Boot backend listens on 8080 (see backend/README.md).
  server: { port: 3000, proxy: { '/api/v1': 'http://localhost:8080' } },
  // The HTTPS E2E stack (e2e/infra/compose.yaml) and Vercel both serve ./build.
  build: { outDir: 'build', sourcemap: false },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
