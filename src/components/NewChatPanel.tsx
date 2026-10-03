import type { FormEvent } from 'react'
import { getAdapter } from '../api/messengers'
import { getMessenger, type Messenger } from '../api/messenger'
import type { InstanceProfile } from '../api/types'
import { Icon } from './Icon'
import styles from './NewChatPanel.module.css'

interface Props {
  open: boolean
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  onClose: () => void
  error: string | null
  messenger?: Messenger
  /** Если передан непустой список — показываем выбор инстанса (режим «Все инстансы») */
  instances?: InstanceProfile[]
  instanceId?: string | null
  onInstanceChange?: (id: string) => void
}

export function NewChatPanel({
  open,
  value,
  onChange,
  onSubmit,
  onClose,
  error,
  messenger = 'max',
  instances = [],
  instanceId = null,
  onInstanceChange,
}: Props) {
  const adapter = getAdapter(messenger)
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
          {instances.length > 1 && (
            <div>
              <label className={styles.fieldLabel} htmlFor="new-chat-instance">
                Инстанс
              </label>
              <select
                id="new-chat-instance"
                data-cy="new-chat-instance"
                className={styles.phoneInput}
                value={instanceId ?? instances[0].id}
                onChange={(e) => onInstanceChange?.(e.target.value)}
              >
                {instances.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getAdapter(getMessenger(p)).label} · {p.label} ({p.idInstance})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={styles.fieldLabel} htmlFor="new-chat-phone">
              {adapter.newChatLabel}
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
                placeholder={adapter.newChatPlaceholder}
                autoComplete="tel"
                autoFocus
              />
            </div>
            <div className={styles.fieldHint}>
              <Icon name="info" size="sm" />
              {adapter.newChatHint}
            </div>
          </div>

          <div className={styles.channelRow}>
            <span className={styles.channelLabel}>Канал отправки:</span>
            <span className={styles.channelBadge}>
              <span className={styles.channelDot} />
              {adapter.label} · GREEN-API
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
