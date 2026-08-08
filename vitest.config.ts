import { defineConfig } from 'vitest/config';
import path from 'node:path';

// `vite-tsconfig-paths` não está instalado; o alias manual evita uma dependência nova
// só para resolver o `@/*` do tsconfig dentro dos testes.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['modules/**/*.test.ts', 'lib/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
});
