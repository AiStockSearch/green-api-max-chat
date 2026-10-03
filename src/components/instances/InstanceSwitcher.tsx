import { getMessenger } from '../../api/messenger'
import type { InstanceProfile } from '../../api/types'
import { instanceStateBadge, type InstanceFilter } from '../../utils/instances'
import { MessengerBadge, StateDot } from './MessengerBadge'
import styles from './Instances.module.css'

interface Props {
  profiles: InstanceProfile[]
  states: Record<string, string | null | undefined>
  value: InstanceFilter
  onChange: (value: InstanceFilter) => void
}

/** Переключатель инстансов в сайдбаре: «Все» (единый список) или один инстанс. */
export function InstanceSwitcher({ profiles, states, value, onChange }: Props) {
  return (
    <div
      className={styles.switcher}
      role="tablist"
      aria-label="Инстансы"
      data-cy="instance-switcher"
    >
      {profiles.length > 1 && (
        <button
          type="button"
          role="tab"
          aria-selected={value === 'all'}
          className={`${styles.chip} ${styles.chipAll} ${value === 'all' ? styles.chipActive : ''}`}
          onClick={() => onChange('all')}
          data-cy="instance-filter-all"
        >
          Все инстансы
        </button>
      )}
      {profiles.map((p) => {
        const badge = instanceStateBadge(states[p.id])
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={value === p.id}
            className={`${styles.chip} ${value === p.id ? styles.chipActive : ''}`}
            onClick={() => onChange(p.id)}
            title={`${p.label} · ${p.idInstance} · ${badge.label}`}
            data-cy={`instance-filter-${p.id}`}
          >
            <MessengerBadge messenger={getMessenger(p)} size="sm" />
            {p.label}
            <StateDot tone={badge.tone} />
          </button>
        )
      })}
    </div>
  )
}
