import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ProHotelAIWidget',
      formats: ['es', 'umd', 'iife'],
      fileName: (format) => {
        if (format === 'es') return 'widget-sdk.es.js'
        if (format === 'umd') return 'widget-sdk.umd.cjs'
        return 'widget-sdk.iife.js'
      },
    },
    sourcemap: true,
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
  },
})
