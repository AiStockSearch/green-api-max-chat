import { Icon } from '../components/Icon'
import styles from './PwaLayer.module.css'
import { isStandalone, useOnline, usePwa } from './usePwa'

interface ViewProps {
  online: boolean
  needRefresh: boolean
  onUpdate: () => void
  onDismissRefresh: () => void
  offlineReady: boolean
  onDismissOfflineReady: () => void
  canInstall: boolean
  onInstall: () => void
  onDismissInstall: () => void
}

/** Презентационная часть (тестируется без SW). */
export function PwaLayerView(p: ViewProps) {
  const iconSrc = `${import.meta.env.BASE_URL}icons/pwa-192.png`
  return (
    <>
      {!p.online && (
        <div className={styles.offline} role="status" aria-live="polite" data-cy="offline-banner">
          <Icon name="wifi_off" size="sm" />
          <span>
            <strong>Нет сети</strong> · отправка и приём возобновятся после подключения
          </span>
        </div>
      )}
      <div className={styles.toasts}>
        {p.needRefresh && (
          <div className={styles.toast} role="alert" data-cy="pwa-update">
            <span className={styles.toastText}>Доступна новая версия</span>
            <button type="button" className={styles.ghost} onClick={p.onDismissRefresh}>
              Позже
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={p.onUpdate}
              data-cy="pwa-update-apply"
            >
              Обновить
            </button>
          </div>
        )}
        {p.offlineReady && !p.needRefresh && (
          <div className={styles.toast} role="status" data-cy="pwa-offline-ready">
            <span className={styles.toastText}>Приложение готово к работе офлайн</span>
            <button type="button" className={styles.ghost} onClick={p.onDismissOfflineReady}>
              OK
            </button>
          </div>
        )}
        {p.canInstall && !p.needRefresh && (
          <div className={styles.toast} role="dialog" aria-label="Установка" data-cy="pwa-install">
            <img className={styles.icon} src={iconSrc} alt="" />
            <span className={styles.toastText}>Установить GREEN-API Chat как приложение?</span>
            <button type="button" className={styles.ghost} onClick={p.onDismissInstall}>
              Не сейчас
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={p.onInstall}
              data-cy="pwa-install-apply"
            >
              Установить
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export function PwaLayer() {
  const online = useOnline()
  const pwa = usePwa(import.meta.env.PROD)
  return (
    <PwaLayerView
      online={online}
      needRefresh={pwa.needRefresh}
      onUpdate={pwa.update}
      onDismissRefresh={pwa.dismissRefresh}
      offlineReady={pwa.offlineReady}
      onDismissOfflineReady={pwa.dismissOfflineReady}
      canInstall={pwa.canInstall && !isStandalone()}
      onInstall={() => void pwa.install()}
      onDismissInstall={pwa.dismissInstall}
    />
  )
}
