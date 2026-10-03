import { normalizeApiUrl } from './apiUrl'

/** Разрешённые upstream-хосты GREEN-API (синхронно с nginx allowlist). */
export const GREEN_API_UPSTREAM_HOST =
  /^(?:\d+\.api\.(?:greenapi|green-api)\.com|api\.(?:greenapi|green-api)\.com)$/i

function shouldUseSameOriginProxy(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    return true
  }
  return import.meta.env.VITE_GREEN_API_SAME_ORIGIN_PROXY === 'true'
}

function proxyPathPrefix(apiOrigin: string): string | null {
  try {
    const target = new URL(apiOrigin)
    if (
      target.hostname === window.location.hostname &&
      target.port === window.location.port
    ) {
      return null
    }
    if (!GREEN_API_UPSTREAM_HOST.test(target.hostname)) {
      return null
    }
    const numericHost = target.hostname.match(/^(\d+)\.api\.(greenapi|green-api)\.com$/i)
    if (numericHost) {
      const tld = numericHost[2].toLowerCase()
      if (tld === 'green-api') {
        return `/green-api-proxy/${target.hostname}`
      }
      return `/green-api-proxy/${numericHost[1]}`
    }
    return `/green-api-proxy/${target.hostname}`
  } catch {
    return null
  }
}

/**
 * Базовый origin API: same-origin прокси в dev или при VITE_GREEN_API_SAME_ORIGIN_PROXY.
 */
export function resolveDevProxyBase(apiUrl: string): string {
  const normalized = normalizeApiUrl(apiUrl)
  if (!shouldUseSameOriginProxy()) {
    return normalized
  }
  const prefix = proxyPathPrefix(normalized)
  if (!prefix) {
    return normalized
  }
  return `${window.location.origin}${prefix}`
}

/** Полный URL запроса с учётом same-origin прокси. */
export function resolveDevProxyFetchUrl(absoluteUrl: string): string {
  if (!shouldUseSameOriginProxy()) {
    return absoluteUrl
  }
  try {
    const parsed = new URL(absoluteUrl)
    const prefix = proxyPathPrefix(parsed.origin)
    if (!prefix) {
      return absoluteUrl
    }
    return `${window.location.origin}${prefix}${parsed.pathname}${parsed.search}`
  } catch {
    return absoluteUrl
  }
}
