import type { Messenger } from '../../api/messenger'
import { MESSENGER_LABELS } from '../../api/messenger'
import { MessengerIcon } from '../icons/MessengerIcon'
import styles from './Instances.module.css'

const PX = { sm: 16, md: 24, lg: 40 } as const

export function MessengerBadge({
  messenger,
  size = 'md',
}: {
  messenger: Messenger
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <span
      className={styles.mIcon}
      title={MESSENGER_LABELS[messenger]}
      role="img"
      aria-label={MESSENGER_LABELS[messenger]}
      data-cy={`messenger-badge-${messenger}`}
    >
      <MessengerIcon messenger={messenger} size={PX[size]} />
    </span>
  )
}

export function StateDot({ tone }: { tone: 'ok' | 'warn' | 'error' | 'unknown' }) {
  return <span className={`${styles.dot} ${styles[`dot_${tone}`]}`} aria-hidden />
}
