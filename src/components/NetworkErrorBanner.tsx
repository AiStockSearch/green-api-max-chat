import { pollErrorBannerText, type PollErrorKind } from '../api/errorMapping'
import { Icon } from './Icon'
import styles from './NetworkErrorBanner.module.css'

interface Props {
  kind: PollErrorKind
  retryInSec?: number
  onRetryNow?: () => void
}

export function NetworkErrorBanner({ kind, retryInSec, onRetryNow }: Props) {
  return (
    <div className={styles.banner} data-ui="network-error-banner" role="alert">
      <span className={styles.icon}>
        <Icon name="sync_problem" />
      </span>
      <p className={styles.text}>{pollErrorBannerText(kind, retryInSec)}</p>
      {onRetryNow && (
        <button type="button" className={styles.retryBtn} onClick={onRetryNow}>
          <Icon name="refresh" size="sm" />
          Повторить сейчас
        </button>
      )}
    </div>
  )
}
