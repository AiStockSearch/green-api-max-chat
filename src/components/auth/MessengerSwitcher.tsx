import { MESSENGERS, MESSENGER_LABELS, type Messenger } from '../../api/messenger'
import styles from './AccountModeSwitcher.module.css'

interface Props {
  value: Messenger
  onChange: (value: Messenger) => void
  disabled?: boolean
}

/** Выбор мессенджера инстанса: MAX (по умолчанию) или WhatsApp (фолбэк по ТЗ). */
export function MessengerSwitcher({ value, onChange, disabled }: Props) {
  return (
    <div className={styles.switcher} role="radiogroup" aria-label="Мессенджер инстанса">
      {MESSENGERS.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={value === m}
          data-cy={`messenger-${m}`}
          className={`${styles.tab} ${value === m ? styles.tabActive : ''}`}
          disabled={disabled}
          onClick={() => onChange(m)}
        >
          {MESSENGER_LABELS[m]}
        </button>
      ))}
    </div>
  )
}
