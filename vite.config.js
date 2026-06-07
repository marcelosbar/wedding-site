import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  envDir: '../',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        admin: resolve(__dirname, 'src/admin.html')
      }
    }
  },
  test: {
    root: './',
    environment: 'jsdom',
    coverage: {
      include: ['src/js/**'],
      exclude: ['src/js/firebase.js'],
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage'
    }
  }
});
