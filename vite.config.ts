import { createHash } from 'node:crypto'
import { readdirSync, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { precacheEntries } from './src/pwa/precache.ts'

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

function listFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...listFiles(full))
    else out.push(full)
  }
  return out
}

/**
 * PWA: собирает src/pwa/sw.ts в dist/sw.js (без хеша, в корне base) и подставляет
 * список precache и версию (хеш списка файлов) — при каждом изменении сборки SW обновляется.
 */
function pwaPlugin(): Plugin {
  let publicDir = ''
  return {
    name: 'gac-pwa',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      publicDir = config.publicDir
    },
    generateBundle(_opts, bundle) {
      const sw = Object.values(bundle).find((c) => c.type === 'chunk' && c.fileName === 'sw.js')
      if (!sw || sw.type !== 'chunk') {
        this.error('gac-pwa: sw.js chunk not found')
        return
      }
      const publicFiles = publicDir ? listFiles(publicDir).map((f) => relative(publicDir, f)) : []
      const entries = precacheEntries(Object.keys(bundle), publicFiles)
      const hash = createHash('sha256')
      for (const item of Object.values(bundle).sort((x, y) =>
        x.fileName.localeCompare(y.fileName),
      )) {
        if (item.fileName === 'sw.js') continue
        hash.update(item.fileName)
        hash.update(item.type === 'chunk' ? item.code : item.source)
      }
      hash.update(entries.join('\n'))
      const version = hash.digest('hex').slice(0, 12)
      sw.code = sw.code
        .replace(/__PRECACHE_MANIFEST__/g, JSON.stringify(entries))
        .replace(/__SW_VERSION__/g, JSON.stringify(version))
      if (/^\s*(import|export)\s/m.test(sw.code)) {
        this.error('gac-pwa: sw.js must be a classic script (no import/export)')
      }
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
  plugins: [react(), greenApiDevProxy(), pwaPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        sw: fileURLToPath(new URL('./src/pwa/sw.ts', import.meta.url)),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
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
