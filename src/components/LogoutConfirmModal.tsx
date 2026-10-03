import { Icon } from './Icon'
import styles from './LogoutConfirmModal.module.css'

interface Props {
  open: boolean
  idInstance: string
  messengerLabel?: string
  busy?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function LogoutConfirmModal({
  open,
  idInstance,
  messengerLabel,
  busy = false,
  error = null,
  onCancel,
  onConfirm,
}: Props) {
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
          Будет вызван метод GREEN-API <code>Logout</code>: аккаунт{messengerLabel ? ` ${messengerLabel}` : ''}{' '}
          отвяжется от инстанса <strong>#{idInstance}</strong>, состояние станет{' '}
          <code>notAuthorized</code>. Чтобы снова получать и отправлять сообщения, нужно заново
          отсканировать QR-код.
        </p>
        <div className={styles.info}>
          <Icon name="info" size="sm" />
          <span>
            Инстанс останется в приложении и в личном кабинете GREEN-API. Чтобы только убрать его из
            приложения без Logout — используйте «Убрать из приложения» на экране инстансов.
          </span>
        </div>
        {error && (
          <p className={styles.text} role="alert" data-cy="logout-error">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            Отмена
          </button>
          <button
            type="button"
            className={styles.confirm}
            onClick={onConfirm}
            disabled={busy}
            data-cy="logout-confirm"
          >
            <Icon name="logout" size="sm" />
            {busy ? 'Выходим…' : 'Выйти (Logout)'}
          </button>
        </div>
      </div>
    </div>
  )
}
