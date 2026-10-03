/// <reference lib="webworker" />
/**
 * Service Worker GREEN-API Chat. Собирается плагином pwaPlugin (vite.config.ts) в dist/sw.js;
 * __PRECACHE_MANIFEST__ и __SW_VERSION__ подставляются на этапе сборки.
 * Кэшируется только app shell (+ Google Fonts). API GREEN-API — всегда сеть, без кэша.
 */
import { isCacheableResponse, offlineFallbackPath, strategyFor } from './swPolicy'

declare const self: ServiceWorkerGlobalScope
declare const __PRECACHE_MANIFEST__: string[]
declare const __SW_VERSION__: string

const VERSION = __SW_VERSION__
const SHELL_CACHE = `gac-shell-${VERSION}`
const FONT_CACHE = 'gac-fonts-v1'
const scopeUrl = new URL(self.registration.scope)
const scopePath = scopeUrl.pathname.endsWith('/') ? scopeUrl.pathname : `${scopeUrl.pathname}/`
const precacheUrls = __PRECACHE_MANIFEST__.map((p) => new URL(p, scopeUrl).href)
const precacheSet = new Set(precacheUrls.map((u) => u.split('?')[0]))

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(precacheUrls.map((u) => new Request(u, { cache: 'reload' })))),
  )
  // Без skipWaiting: новая версия ждёт, пока пользователь нажмёт «Обновить».
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k.startsWith('gac-shell-') && k !== SHELL_CACHE)
          .map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  const data = event.data as { type?: string } | null
  if (data?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  } else if (data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: VERSION })
  }
})

async function fromPrecache(request: Request): Promise<Response> {
  const cache = await caches.open(SHELL_CACHE)
  const hit = await cache.match(request, { ignoreSearch: true })
  return hit ?? fetch(request)
}

async function navigation(request: Request): Promise<Response> {
  try {
    return await fetch(request)
  } catch {
    const cache = await caches.open(SHELL_CACHE)
    const path = offlineFallbackPath(new URL(request.url).pathname, scopePath)
    const hit =
      (await cache.match(new URL(path, scopeUrl).href, { ignoreSearch: true })) ??
      (await cache.match(new URL(`${scopePath}index.html`, scopeUrl).href))
    return hit ?? Response.error()
  }
}

async function font(request: Request): Promise<Response> {
  const cache = await caches.open(FONT_CACHE)
  const hit = await cache.match(request)
  const network = fetch(request)
    .then((res) => {
      if (isCacheableResponse(request.url, res.status, res.type)) {
        void cache.put(request, res.clone())
      }
      return res
    })
    .catch(() => hit ?? Response.error())
  return hit ?? network
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  const strategy = strategyFor(
    { url: req.url, method: req.method, mode: req.mode, destination: req.destination },
    self.location.origin,
    scopePath,
    precacheSet,
  )
  if (strategy === 'network-only') return // браузер сам идёт в сеть; ничего не кэшируем
  if (strategy === 'precache') event.respondWith(fromPrecache(req))
  else if (strategy === 'navigation') event.respondWith(navigation(req))
  else if (strategy === 'font') event.respondWith(font(req))
})
