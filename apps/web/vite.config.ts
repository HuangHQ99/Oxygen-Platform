import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const backendProxy = {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
  '/actuator': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
  '/login': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
  '/logout': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
  '/oauth2': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
  '/login/oauth2': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: backendProxy,
  },
  preview: {
    proxy: backendProxy,
  },
})
