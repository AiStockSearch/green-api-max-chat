import type { FormEvent } from 'react'
import { Icon } from './Icon'
import styles from './NewChatPanel.module.css'

interface Props {
  open: boolean
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  onClose: () => void
  error: string | null
}

export function NewChatPanel({ open, value, onChange, onSubmit, onClose, error }: Props) {
  if (!open) {
    return null
  }

  return (
    <div
      className={styles.overlay}
      data-ui="new-chat-panel"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-labelledby="new-chat-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHead}>
          <div className={styles.modalHeadTop}>
            <div className={styles.modalBrand}>
              <div className={styles.modalIcon}>
                <Icon name="chat" size="lg" />
              </div>
              <div>
                <h2 id="new-chat-title" className={styles.modalTitle}>
                  Новый чат
                </h2>
                <p className={styles.modalSubtitle}>Через шлюз GREEN-API</p>
              </div>
            </div>
            <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={onClose}>
              <Icon name="close" size="sm" />
            </button>
          </div>
          <p className={styles.modalDesc}>
            Введите номер телефона контакта для начала переписки через шлюз GREEN-API.
          </p>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <div>
            <label className={styles.fieldLabel} htmlFor="new-chat-phone">
              Номер телефона
            </label>
            <div className={styles.phoneWrap}>
              <span className={styles.phoneIcon}>
                <Icon name="call" size="sm" />
              </span>
              <input
                id="new-chat-phone"
                className={styles.phoneInput}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="+7 (___) ___-__-__"
                autoComplete="tel"
                autoFocus
              />
            </div>
            <div className={styles.fieldHint}>
              <Icon name="info" size="sm" />
              Введите номер в формате +7XXXXXXXXXX
            </div>
          </div>

          <div className={styles.channelRow}>
            <span className={styles.channelLabel}>Канал отправки:</span>
            <span className={styles.channelBadge}>
              <span className={styles.channelDot} />
              MAX · GREEN-API
            </span>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className={styles.submitBtn} data-cy="new-chat-submit">
              Создать чат
              <Icon name="arrow_forward" size="sm" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
