import type { FormEvent } from 'react'
import ui from '../styles/ui.module.css'
import styles from './NewChatPanel.module.css'

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  error: string | null
  /** Для будущего модального макета Stitch: обёртка может стать dialog */
  variant?: 'inline' | 'modal'
}

/** Панель создания чата — логика снаружи, вёрстка изолирована для подмены под модалку. */
export function NewChatPanel({ value, onChange, onSubmit, error, variant = 'inline' }: Props) {
  const rootClass = variant === 'modal' ? `${styles.root} ${styles.modal}` : styles.root

  return (
    <div className={rootClass} data-ui="new-chat-panel">
      {variant === 'modal' && (
        <h3 className={styles.modalTitle}>Новый чат</h3>
      )}
      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.label}>
          <span className={ui.fieldLabel}>Номер или chatId</span>
          <input
            className={ui.textInput}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="79991234567 или 10000000"
            aria-label="Номер телефона или идентификатор чата"
          />
          <span className={ui.fieldHint}>
            Для MAX: числовой chatId или номер в формате 79001234567@c.us
          </span>
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={ui.primaryButton}>
          Создать чат
        </button>
      </form>
    </div>
  )
}
