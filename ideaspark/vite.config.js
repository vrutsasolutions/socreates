import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // sockjs-client references the Node global `global`, which doesn't exist in
  // browser ESM. Alias it to globalThis so the STOMP/SockJS notification
  // transport works in the Vite dev/prod build.
  define: {
    global: 'globalThis',
  },
})
