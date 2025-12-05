import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
build: {
    // Prevent Vite from extracting CSS into separate files
    cssCodeSplit: false,
    // Keep predictable asset names so you can reference them easily after upload
    rollupOptions: {
      output: {
        entryFileNames: 'assets/main.js',
        chunkFileNames: 'assets/chunk-[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
})
