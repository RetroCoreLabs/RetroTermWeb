import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/ui/**/*.test.ts'],
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['test/ui/setup.ts'],
  },
});
