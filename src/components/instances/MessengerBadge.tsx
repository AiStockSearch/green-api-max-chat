import type { Messenger } from '../../api/messenger'
import { MESSENGER_LABELS } from '../../api/messenger'
import styles from './Instances.module.css'

const SHORT: Record<Messenger, string> = { whatsapp: 'WA', telegram: 'TG', max: 'MAX' }

export function MessengerBadge({
  messenger,
  size = 'md',
}: {
  messenger: Messenger
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <span
      className={`${styles.mBadge} ${styles[`mBadge_${messenger}`]} ${styles[`mBadge_${size}`]}`}
      title={MESSENGER_LABELS[messenger]}
      aria-label={MESSENGER_LABELS[messenger]}
      data-cy={`messenger-badge-${messenger}`}
    >
      {SHORT[messenger]}
    </span>
  )
}

export function StateDot({ tone }: { tone: 'ok' | 'warn' | 'error' | 'unknown' }) {
  return <span className={`${styles.dot} ${styles[`dot_${tone}`]}`} aria-hidden />
}
