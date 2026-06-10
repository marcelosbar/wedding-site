import { defineConfig } from 'vite';

/**
 * Dedicated Vitest configuration for integration tests.
 * These tests require the Firebase Firestore Emulator to be running
 * and are executed via: npm run test:integration
 */
export default defineConfig({
  test: {
    root: './',
    environment: 'node',
    include: ['tests/integration/**/*.test.js'],
  },
});
