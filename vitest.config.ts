import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Pin the test process's timezone so date-boundary logic (which now keys off the
    // device's local calendar day, see defaultState.ts's dateStrLocal) is deterministic
    // across CI and every contributor's machine, regardless of where tests run.
    env: { TZ: 'UTC' },
  },
});
