import { normalizeApiUrl } from './apiUrl'

function shouldUseDevProxy(): boolean {
  return (
    import.meta.env.DEV &&
    import.meta.env.MODE !== 'test' &&
    typeof window !== 'undefined'
  )
}

/**
 * Базовый origin API: в dev → same-origin прокси Vite.
 */
export function resolveDevProxyBase(apiUrl: string): string {
  const normalized = normalizeApiUrl(apiUrl)
  if (!shouldUseDevProxy()) {
    return normalized
  }
  try {
    const target = new URL(normalized)
    if (
      target.hostname === window.location.hostname &&
      target.port === window.location.port
    ) {
      return normalized
    }
    const numericHost = target.hostname.match(/^(\d+)\.api\.(greenapi\.com|green-api\.com)$/i)
    if (numericHost) {
      return `${window.location.origin}/green-api-proxy/${numericHost[1]}`
    }
    return `${window.location.origin}/green-api-proxy/${encodeURIComponent(target.hostname)}`
  } catch {
    return normalized
  }
}

/** Полный URL запроса с учётом dev-прокси. */
export function resolveDevProxyFetchUrl(absoluteUrl: string): string {
  if (!shouldUseDevProxy()) {
    return absoluteUrl
  }
  try {
    const parsed = new URL(absoluteUrl)
    const proxyBase = resolveDevProxyBase(parsed.origin)
    if (proxyBase === parsed.origin) {
      return absoluteUrl
    }
    return `${proxyBase}${parsed.pathname}${parsed.search}`
  } catch {
    return absoluteUrl
  }
}
