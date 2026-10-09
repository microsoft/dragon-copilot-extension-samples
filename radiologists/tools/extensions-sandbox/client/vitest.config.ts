import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // The default forks pool spawns child processes that can time out before
    // they hand back a handshake on Windows. A single worker thread starts
    // reliably and shares one module cache across the suites, which matters
    // because each file otherwise re-imports jsdom, React, and Fluent UI.
    pool: 'threads',
    fileParallelism: false,
    // Only the TypeScript sources; the default glob would also pick up anything
    // emitted into dist/.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
