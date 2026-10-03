import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** Allowlist upstream-хостов GREEN-API (MAX и WhatsApp), синхронно с src/api/devProxy.ts и docker/nginx.conf. */
const GREEN_API_UPSTREAM_HOST =
  /^(?:\d+\.api\.(?:greenapi|green-api)\.com|api\.(?:greenapi|green-api)\.com)$/i

/**
 * /green-api-proxy/{shard}/…            → https://{shard}.api.greenapi.com/…
 * /green-api-proxy/{allowlisted-host}/… → https://{host}/…
 * Иначе null (403, не open proxy).
 */
export function resolveGreenApiProxyTarget(url: string): string | null {
  const m = url.match(/^\/green-api-proxy\/([^/?]+)(\/[^?]*)?(\?.*)?$/)
  if (!m) {
    return null
  }
  const segment = decodeURIComponent(m[1])
  const path = m[2] || '/'
  const query = m[3] || ''
  if (/^\d+$/.test(segment)) {
    return `https://${segment}.api.greenapi.com${path}${query}`
  }
  if (GREEN_API_UPSTREAM_HOST.test(segment)) {
    return `https://${segment.toLowerCase()}${path}${query}`
  }
  return null
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/** Dev/Cypress: same-origin прокси к GREEN-API (обход CORS), повторяет логику nginx. */
function greenApiDevProxy(): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    const target = resolveGreenApiProxyTarget(req.originalUrl ?? req.url ?? '')
    if (!target) {
      res.statusCode = 403
      res.setHeader('Content-Type', 'application/json')
      res.end('{"error":"green-api-proxy: host not allowed"}\n')
      return
    }
    try {
      const method = req.method ?? 'GET'
      const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req)
      const upstream = await fetch(target, {
        method,
        headers: { 'Content-Type': String(req.headers['content-type'] ?? 'application/json') },
        body: body && body.length ? new Uint8Array(body) : undefined,
      })
      res.statusCode = upstream.status
      const ct = upstream.headers.get('content-type')
      if (ct) {
        res.setHeader('Content-Type', ct)
      }
      res.end(Buffer.from(await upstream.arrayBuffer()))
    } catch (err) {
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: `green-api-proxy: ${(err as Error).message}` }))
    }
  }
  return {
    name: 'green-api-dev-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url ?? '').startsWith('/green-api-proxy/')) {
          void handler(req as IncomingMessage & { originalUrl?: string }, res)
          return
        }
        next()
      })
    },
  }
}

declare module 'node:http' {
  interface IncomingMessage {
    originalUrl?: string
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), greenApiDevProxy()],
  base: mode === 'production' && process.env.GITHUB_PAGES === 'true' ? '/green-api-max-chat/' : '/',
  server: {
    port: 43123,
    strictPort: Boolean(process.env.CYPRESS),
    host: '127.0.0.1',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
}))
