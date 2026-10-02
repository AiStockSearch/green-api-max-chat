import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' && process.env.GITHUB_PAGES === 'true' ? '/green-api-max-chat/' : '/',
  server: {
    port: 43123,
    host: '127.0.0.1',
    proxy: {
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
