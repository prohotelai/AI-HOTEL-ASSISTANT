import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setupMocks.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '@playwright/test': path.resolve(__dirname, 'tests/playwright-stub.ts'),
    },
  },
})
