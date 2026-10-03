import { messengerLabel } from '../api/messenger'
import type { GreenApiCredentials } from '../api/types'
import { Icon } from './Icon'
import styles from './InstanceUnauthorizedPanel.module.css'

interface Props {
  credentials: GreenApiCredentials
  stateLabel?: string | null
  checking: boolean
  onRecheck: () => void
  onChangeInstance: () => void
}

export function InstanceUnauthorizedPanel({
  credentials,
  stateLabel,
  checking,
  onRecheck,
  onChangeInstance,
}: Props) {
  return (
    <div className={styles.wrap} data-ui="instance-unauthorized">
      <article className={styles.card}>
        <div className={styles.gradientBar} />
        <div className={styles.body}>
          <div className={styles.iconBox}>
            <Icon name="warning" size="lg" />
          </div>
          <h2 className={styles.title}>Инстанс не авторизован в {messengerLabel(credentials)}</h2>
          <p className={styles.desc}>
            Инстанс GREEN-API подключён, но не имеет активной сессии или требует повторной
            авторизации в мессенджере.
          </p>
          <div className={styles.steps}>
            <p className={styles.stepsTitle}>ШАГИ ДЛЯ ВОЗОБНОВЛЕНИЯ РАБОТЫ</p>
            <ol>
              <li>
                Проверьте параметры: <code>idInstance</code> [{credentials.idInstance}] и{' '}
                <code>apiTokenInstance</code>.
              </li>
              <li>Убедитесь, что инстанс активен и QR-код отсканирован в личном кабинете.</li>
              <li>При необходимости перезагрузите инстанс в панели управления.</li>
            </ol>
          </div>
          <a
            className={styles.link}
            href="https://console.green-api.com"
            target="_blank"
            rel="noreferrer"
          >
            Открыть консоль GREEN-API
            <Icon name="open_in_new" size="sm" />
          </a>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={checking} onClick={onRecheck}>
              <Icon name="refresh" size="sm" />
              {checking ? 'Проверка…' : 'Проверить снова'}
            </button>
            <button type="button" className={styles.secondary} onClick={onChangeInstance}>
              <Icon name="checklist" size="sm" />
              Сменить инстанс
            </button>
          </div>
          <div className={styles.footer}>
            <span>
              ● Статус шлюза: {stateLabel ?? 'notAuthorized'}
            </span>
            <span>
              <Icon name="lock" size="sm" /> Сквозное шифрование GREEN-API
            </span>
          </div>
        </div>
      </article>
    </div>
  )
}
