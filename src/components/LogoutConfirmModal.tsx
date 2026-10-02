import { Icon } from './Icon'
import styles from './LogoutConfirmModal.module.css'

interface Props {
  open: boolean
  idInstance: string
  onCancel: () => void
  onConfirm: () => void
}

export function LogoutConfirmModal({ open, idInstance, onCancel, onConfirm }: Props) {
  if (!open) {
    return null
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onCancel}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-labelledby="logout-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} aria-label="Закрыть" onClick={onCancel}>
          <Icon name="close" />
        </button>
        <div className={styles.head}>
          <div className={styles.icon}>
            <Icon name="logout" />
          </div>
          <div>
            <h2 id="logout-title" className={styles.title}>
              Выйти из инстанса?
            </h2>
            <span className={styles.badge}>ID: #{idInstance}</span>
          </div>
        </div>
        <p className={styles.text}>
          Текущая сессия работы с инстансом <strong>#{idInstance}</strong> будет завершена. Для
          отправки и получения сообщений потребуется повторная авторизация через{' '}
          <code>idInstance</code> и <code>apiTokenInstance</code>.
        </p>
        <div className={styles.info}>
          <Icon name="info" size="sm" />
          <span>
            История сообщений и сохранённые настройки останутся в GREEN-API и не будут удалены с
            серверов.
          </span>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className={styles.confirm} onClick={onConfirm}>
            <Icon name="logout" size="sm" />
            Выйти
          </button>
        </div>
      </div>
    </div>
  )
}
