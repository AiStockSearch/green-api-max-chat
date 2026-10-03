/**
 * Регистрация Service Worker и поток обновления «Доступна новая версия — Обновить».
 * Зависимости передаются явно — логика покрыта unit-тестами без настоящего SW.
 */

export interface SwDeps {
  container: ServiceWorkerContainer
  reload: () => void
  /** Периодическая проверка обновлений (мс); 0 — выкл. */
  updateIntervalMs?: number
  setInterval?: (fn: () => void, ms: number) => unknown
}

export interface SwCallbacks {
  /** Новая версия установлена и ждёт — показать «Обновить». */
  onNeedRefresh: (waiting: ServiceWorker) => void
  /** Первая установка завершена — app shell доступен офлайн. */
  onOfflineReady?: () => void
  onError?: (err: unknown) => void
}

export function swUrl(baseUrl: string): { url: string; scope: string } {
  const scope = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return { url: `${scope}sw.js`, scope }
}

/** Отслеживает установку новой версии: зовёт onNeedRefresh только если уже есть активный контроллер. */
export function watchRegistration(
  reg: ServiceWorkerRegistration,
  container: ServiceWorkerContainer,
  cb: SwCallbacks,
): void {
  if (reg.waiting && container.controller) {
    cb.onNeedRefresh(reg.waiting)
  }
  reg.addEventListener('updatefound', () => {
    const installing = reg.installing
    if (!installing) return
    installing.addEventListener('statechange', () => {
      if (installing.state !== 'installed') return
      if (container.controller) {
        cb.onNeedRefresh(reg.waiting ?? installing)
      } else {
        cb.onOfflineReady?.()
      }
    })
  })
}

export async function registerServiceWorker(
  baseUrl: string,
  deps: SwDeps,
  cb: SwCallbacks,
): Promise<ServiceWorkerRegistration | null> {
  const { url, scope } = swUrl(baseUrl)
  try {
    const reg = await deps.container.register(url, { scope, updateViaCache: 'none' })
    watchRegistration(reg, deps.container, cb)
    const interval = deps.updateIntervalMs ?? 60 * 60 * 1000
    if (interval > 0) {
      ;(deps.setInterval ?? setInterval)(() => {
        void reg.update().catch(() => undefined)
      }, interval)
    }
    return reg
  } catch (err) {
    cb.onError?.(err)
    return null
  }
}

/** «Обновить»: просим ждущий SW активироваться и перезагружаем страницу один раз после смены контроллера. */
export function applyUpdate(
  waiting: ServiceWorker,
  deps: Pick<SwDeps, 'container' | 'reload'>,
): void {
  let reloaded = false
  deps.container.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    deps.reload()
  })
  waiting.postMessage({ type: 'SKIP_WAITING' })
}
