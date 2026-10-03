/**
 * Состояние сети для баннера «Нет сети».
 * navigator.onLine ненадёжен (true при Wi-Fi без интернета), поэтому дополнительно:
 * после сетевой ошибки запроса (или при старте/событии online) делаем лёгкую пробу —
 * HEAD к sw.js (не в precache → SW пропускает в сеть, ответ не кэшируется).
 */

type Listener = () => void

export interface NetworkStatusDeps {
  fetch: (url: string, init: RequestInit) => Promise<unknown>
  isBrowserOnline: () => boolean
  probeUrl: () => string
  setTimeout: (fn: () => void, ms: number) => unknown
  clearTimeout: (id: unknown) => void
  retryMs?: number
}

export function createNetworkStatus(deps: NetworkStatusDeps) {
  let reachable = true
  let browserOnline = deps.isBrowserOnline()
  let probing: Promise<boolean> | null = null
  let retry: unknown = null
  const listeners = new Set<Listener>()
  const emit = () => listeners.forEach((l) => l())

  const isOffline = () => !browserOnline || !reachable

  function scheduleRetry() {
    if (retry !== null) return
    retry = deps.setTimeout(() => {
      retry = null
      void probe()
    }, deps.retryMs ?? 10_000)
  }

  async function probe(): Promise<boolean> {
    if (probing) return probing
    probing = (async () => {
      let ok: boolean
      try {
        await deps.fetch(deps.probeUrl(), { method: 'HEAD', cache: 'no-store' })
        ok = true
      } catch {
        ok = false
      }
      const before = isOffline()
      reachable = ok
      if (ok && retry !== null) {
        deps.clearTimeout(retry)
        retry = null
      }
      if (!ok) scheduleRetry()
      if (before !== isOffline()) emit()
      return ok
    })()
    try {
      return await probing
    } finally {
      probing = null
    }
  }

  return {
    isOffline,
    subscribe(l: Listener) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    /** Сетевая ошибка запроса (fetch бросил TypeError) — перепроверяем доступность. */
    reportFailure() {
      void probe()
    },
    setBrowserOnline(online: boolean) {
      const before = isOffline()
      browserOnline = online
      if (online) void probe()
      if (before !== isOffline()) emit()
    },
    probe,
  }
}

const browser = typeof window !== 'undefined' && typeof navigator !== 'undefined'

export const networkStatus = createNetworkStatus({
  fetch: (url, init) => fetch(url, init),
  isBrowserOnline: () => (browser ? navigator.onLine : true),
  probeUrl: () => `${import.meta.env.BASE_URL}sw.js?probe=${Date.now()}`,
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
})

if (browser) {
  window.addEventListener('online', () => networkStatus.setBrowserOnline(true))
  window.addEventListener('offline', () => networkStatus.setBrowserOnline(false))
}

/** Сообщить о сетевой ошибке запроса к API (вызывается из клиентов GREEN-API). */
export function reportNetworkFailure(): void {
  networkStatus.reportFailure()
}
