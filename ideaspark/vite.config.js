import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  build: {
    // Vite auto-injects <link rel="modulepreload"> for every chunk it
    // thinks a page might need next (other routes, lazy components, etc).
    // Chrome then warns "preloaded but not used within a few seconds" for
    // whichever ones the user doesn't immediately navigate to — harmless,
    // but noisy in the console. Turning this off stops the auto-injection;
    // chunks still load normally on-demand when actually needed, just
    // without the speculative preload hint.
    modulePreload: false,
  },
  server: {
    host: true,
    allowedHosts: ['.ngrok-free.dev', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})