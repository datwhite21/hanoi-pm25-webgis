import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@hanoi-pm25/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
    },
  },
  test: {
    include: [
      'packages/**/src/__tests__/**/*.test.ts',
      'apps/**/src/__tests__/**/*.test.ts',
    ],
  },
});

