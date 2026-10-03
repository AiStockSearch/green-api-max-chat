import styles from './AccountModeSwitcher.module.css'

export type AccountMode = 'instance' | 'partner'

interface Props {
  mode: AccountMode
  onChange: (mode: AccountMode) => void
  disabled?: boolean
}

export function AccountModeSwitcher({ mode, onChange, disabled }: Props) {
  return (
    <div className={styles.switcher} role="tablist" aria-label="Режим входа">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'instance'}
        data-cy="mode-instance"
        className={`${styles.tab} ${mode === 'instance' ? styles.tabActive : ''}`}
        disabled={disabled}
        onClick={() => onChange('instance')}
      >
        По ключам инстанса
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'partner'}
        data-cy="mode-partner"
        className={`${styles.tab} ${mode === 'partner' ? styles.tabActive : ''}`}
        disabled={disabled}
        onClick={() => onChange('partner')}
      >
        Режим партнёра
      </button>
    </div>
  )
}
