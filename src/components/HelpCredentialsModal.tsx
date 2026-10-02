import { Icon } from './Icon'
import styles from './HelpCredentialsModal.module.css'

interface Props {
  open: boolean
  onClose: () => void
}

export function HelpCredentialsModal({ open, onClose }: Props) {
  if (!open) {
    return null
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} aria-label="Закрыть" onClick={onClose}>
          <Icon name="close" />
        </button>
        <div className={styles.head}>
          <div className={styles.headIcon}>
            <Icon name="info" />
          </div>
          <h2 id="help-title" className={styles.title}>
            Где найти реквизиты инстанса?
          </h2>
        </div>
        <div className={styles.body}>
          <p>Для подключения нужны ключи доступа инстанса GREEN-API:</p>
          <ol>
            <li>
              Откройте{' '}
              <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
                console.green-api.com
              </a>
              .
            </li>
            <li>Выберите инстанс MAX в списке.</li>
            <li>
              Скопируйте <code>idInstance</code> и <code>apiTokenInstance</code>, а также{' '}
              <code>apiUrl</code> при необходимости.
            </li>
          </ol>
          <p>Инстанс должен быть в статусе «Авторизован».</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.okBtn} onClick={onClose}>
            Понятно
          </button>
        </div>
      </div>
    </div>
  )
}
