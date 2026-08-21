import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only run the TypeScript sources. Without this, vitest's default glob also
    // picks up the compiled copies under dist/, so every suite runs twice and a
    // stale build can fail (or silently mask) tests that were just edited.
    include: ['src/**/*.test.ts'],
  },
});
