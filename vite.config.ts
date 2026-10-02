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
      /** Dev/Cypress: /green-api-proxy/{hostname}/waInstance… → https://{hostname}/… */
      '/green-api-proxy': {
        target: 'https://api.green-api.com',
        changeOrigin: true,
        secure: true,
        router(req) {
          const raw = req.url ?? ''
          const legacy = raw.match(/^\/green-api-proxy\/(\d+)(\/|$)/)
          if (legacy) {
            return `https://${legacy[1]}.api.greenapi.com`
          }
          const encoded = raw.match(/^\/green-api-proxy\/([^/]+)(\/|$)/)
          if (encoded) {
            const host = decodeURIComponent(encoded[1])
            if (host.includes('.')) {
              return `https://${host}`
            }
          }
          return 'https://api.green-api.com'
        },
        rewrite(path) {
          const legacy = path.match(/^\/green-api-proxy\/\d+(.*)$/)
          if (legacy) {
            return legacy[1] || '/'
          }
          const encoded = path.match(/^\/green-api-proxy\/[^/]+(.*)$/)
          if (encoded) {
            return encoded[1] || '/'
          }
          return path.replace(/^\/green-api-proxy/, '')
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
}))
