import { MESSENGERS, MESSENGER_LABELS, type Messenger } from '../../api/messenger'
import { Icon } from '../Icon'
import { MessengerIcon } from '../icons/MessengerIcon'
import styles from './MessengerSwitcher.module.css'

interface Props {
  value: Messenger
  onChange: (value: Messenger) => void
  disabled?: boolean
}

/** Выбор мессенджера инстанса: три равные карточки в ряд (WhatsApp / Telegram / MAX). */
export function MessengerSwitcher({ value, onChange, disabled }: Props) {
  return (
    <div className={styles.grid} role="radiogroup" aria-label="Мессенджер инстанса">
      {MESSENGERS.map((m) => {
        const active = value === m
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            data-cy={`messenger-${m}`}
            className={`${styles.card} ${active ? styles.active : ''}`}
            disabled={disabled}
            onClick={() => onChange(m)}
          >
            {active && (
              <span className={styles.check} aria-hidden="true">
                <Icon name="check" size="sm" />
              </span>
            )}
            <MessengerIcon messenger={m} size={32} />
            <span className={styles.label}>{MESSENGER_LABELS[m]}</span>
          </button>
        )
      })}
    </div>
  )
}
