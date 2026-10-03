import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { networkStatus } from './networkStatus'
import { applyUpdate, registerServiceWorker } from './registerSW'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** false, если сети нет (navigator.onLine или неудачная проба после сетевой ошибки). */
export function useOnline(): boolean {
  const offline = useSyncExternalStore(
    networkStatus.subscribe,
    networkStatus.isOffline,
    () => false,
  )
  return !offline
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function usePwa(enabled: boolean) {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (enabled) void networkStatus.probe()
  }, [enabled])

  useEffect(() => {
    if (!enabled || !('serviceWorker' in navigator)) return
    void registerServiceWorker(
      import.meta.env.BASE_URL,
      { container: navigator.serviceWorker, reload: () => window.location.reload() },
      { onNeedRefresh: setWaiting, onOfflineReady: () => setOfflineReady(true) },
    )
  }, [enabled])

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstallEvent(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const update = useCallback(() => {
    if (waiting) {
      applyUpdate(waiting, {
        container: navigator.serviceWorker,
        reload: () => window.location.reload(),
      })
    }
  }, [waiting])

  const install = useCallback(async () => {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice.catch(() => undefined)
    setInstallEvent(null)
  }, [installEvent])

  return {
    needRefresh: waiting !== null,
    dismissRefresh: () => setWaiting(null),
    update,
    offlineReady,
    dismissOfflineReady: () => setOfflineReady(false),
    canInstall: installEvent !== null,
    install,
    dismissInstall: () => setInstallEvent(null),
  }
}
