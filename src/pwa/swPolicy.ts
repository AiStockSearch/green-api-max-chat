/**
 * Политика Service Worker (чистые функции, покрыты тестами).
 * Главное правило: запросы к GREEN-API (прямые хосты и same-origin прокси) — только сеть,
 * их ответы и URL (в URL есть apiTokenInstance) никогда не попадают в Cache Storage.
 */

export type SwStrategy =
  | 'network-only' // не перехватываем (браузер идёт в сеть сам)
  | 'precache' // cache-first из precache (app shell)
  | 'navigation' // network-first, офлайн → app shell
  | 'font' // stale-while-revalidate для Google Fonts (без секретов)

export const GREEN_API_HOST_RE = /(^|\.)(green-api|greenapi)\.com$/i
export const PROXY_SEGMENT = '/green-api-proxy/'
/** Методы GREEN-API в пути: /waInstance{id}/… и Partner API /partner/… */
const API_PATH_RE = /\/(waInstance\d+|partner)\//i
const FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com'])

export function isGreenApiRequest(url: URL): boolean {
  return (
    GREEN_API_HOST_RE.test(url.hostname) ||
    url.pathname.includes(PROXY_SEGMENT) ||
    API_PATH_RE.test(url.pathname)
  )
}

export interface RequestInfo {
  url: string
  method: string
  mode?: string
  destination?: string
}

/**
 * @param origin   origin страницы SW (self.location.origin)
 * @param scopePath путь scope с завершающим «/» (например /green-api-max-chat/)
 * @param precache набор абсолютных URL из precache
 */
export function strategyFor(
  req: RequestInfo,
  origin: string,
  scopePath: string,
  precache: ReadonlySet<string>,
): SwStrategy {
  if (req.method !== 'GET') return 'network-only'
  let url: URL
  try {
    url = new URL(req.url)
  } catch {
    return 'network-only'
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'network-only'
  if (isGreenApiRequest(url)) return 'network-only'
  if (url.origin !== origin) {
    return FONT_HOSTS.has(url.hostname) ? 'font' : 'network-only'
  }
  if (!url.pathname.startsWith(scopePath)) return 'network-only'
  if (req.mode === 'navigate') return 'navigation'
  const clean = url.origin + url.pathname
  if (precache.has(clean)) return 'precache'
  return 'network-only'
}

/** Можно ли положить ответ в кэш: только успешные, без секретов в URL. */
export function isCacheableResponse(url: string, status: number, type: string): boolean {
  if (status !== 200 && !(type === 'opaque' && status === 0)) return false
  try {
    const u = new URL(url)
    if (GREEN_API_HOST_RE.test(u.hostname) || u.pathname.includes(PROXY_SEGMENT)) return false
    if (API_PATH_RE.test(u.pathname)) return false
    if (/token/i.test(u.search)) return false
  } catch {
    return false
  }
  return true
}

/** Навигация офлайн: страница .html (например guide.html) — её кэш, иначе app shell (SPA-маршрут). */
export function offlineFallbackPath(pathname: string, scopePath: string): string {
  if (/\.html?$/i.test(pathname) && !pathname.endsWith('/index.html')) return pathname
  return `${scopePath}index.html`
}
