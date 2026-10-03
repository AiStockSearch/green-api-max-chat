import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import styles from '../LogoutConfirmModal.module.css'

interface Props {
  open: boolean
  title: string
  badge?: string
  icon?: string
  confirmLabel: string
  busy?: boolean
  error?: string | null
  children: ReactNode
  onCancel: () => void
  onConfirm: () => void
  cy?: string
}

/** Универсальное подтверждение (стили модалки выхода). */
export function ConfirmDialog({
  open,
  title,
  badge,
  icon = 'warning',
  confirmLabel,
  busy,
  error,
  children,
  onCancel,
  onConfirm,
  cy,
}: Props) {
  if (!open) {
    return null
  }
  return (
    <div className={styles.overlay} role="presentation" onClick={onCancel} data-cy={cy}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} aria-label="Закрыть" onClick={onCancel}>
          <Icon name="close" />
        </button>
        <div className={styles.head}>
          <div className={styles.icon}>
            <Icon name={icon} />
          </div>
          <div>
            <h2 id="confirm-title" className={styles.title}>
              {title}
            </h2>
            {badge && <span className={styles.badge}>{badge}</span>}
          </div>
        </div>
        <div className={styles.text}>{children}</div>
        {error && (
          <p className={styles.text} role="alert" style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel} disabled={busy}>
            Отмена
          </button>
          <button
            type="button"
            className={styles.confirm}
            onClick={onConfirm}
            disabled={busy}
            data-cy="confirm-dialog-ok"
          >
            {busy ? 'Подождите…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
