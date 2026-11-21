import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/tests/**/*.test.js'],
    env: {
      NODE_ENV: 'test',
      BCRYPT_ROUNDS: '4',
    },
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
