import { defineConfig } from 'vitest/config';

// Unit tests run the same library code the Worker runs, against an in-memory SQLite
// database loaded from the real migration files.
export default defineConfig({ test: { include: ['test/**/*.test.ts'], environment: 'node' } });
