import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' && process.env.GITHUB_PAGES === 'true' ? '/green-api-max-chat/' : '/',
  server: {
    port: 43123,
    strictPort: Boolean(process.env.CYPRESS),
    host: '127.0.0.1',
    proxy: {
      /** E2E / dev: обход CORS для хоста инстанса из кабинета (7107.api.greenapi.com) */
      '/green-api-proxy/7107': {
        target: 'https://7107.api.greenapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/green-api-proxy\/7107/, ''),
        secure: true,
      },
      '/green-api-proxy': {
        target: 'https://api.green-api.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/green-api-proxy/, ''),
        secure: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
}))
