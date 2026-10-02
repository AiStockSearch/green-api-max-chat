import { SiteFooter } from '../layout/SiteFooter'
import { TopNavBar } from '../layout/TopNavBar'
import { Icon } from '../Icon'
import styles from '../LoginScreen.module.css'

interface Props {
  onGoLogin: () => void
}

export function RegisterScreen({ onGoLogin }: Props) {
  return (
    <div className={styles.page} data-ui="register-screen">
      <div className={styles.backdrop} aria-hidden>
        <div className={styles.glowTop} />
      </div>
      <TopNavBar appNav={{ onLogin: onGoLogin, active: 'register' }} />
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.brandBlock}>
            <div className={styles.badge}>
              <Icon name="forum" filled size="sm" />
              GREEN-API MAX
            </div>
            <h1 className={styles.title}>Регистрация</h1>
            <p className={styles.subtitle}>
              У GREEN-API нет публичного API регистрации конечных пользователей. Аккаунт
              личного кабинета создаётся на официальном сайте.
            </p>
          </div>

          <div className={styles.alertBanner} role="status" style={{ background: 'var(--color-surface-container)' }}>
            <Icon name="info" />
            <span>
              Зарегистрируйтесь в{' '}
              <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
                console.green-api.com
              </a>
              , создайте инстанс MAX и скопируйте <code>idInstance</code> /{' '}
              <code>apiTokenInstance</code>. Для партнёрского режима запросите{' '}
              <code>partnerToken</code> у support@green-api.com.
            </span>
          </div>

          <ul className={styles.registerList}>
            <li>
              <strong>Режим «Инстанс»</strong> — вход по ключам одного инстанса (текущий чат).
            </li>
            <li>
              <strong>Режим «Партнёр»</strong> — Partner API: getInstances, createInstance,
              deleteInstanceAccount, затем авторизация инстанса (QR / getStateInstance).
            </li>
          </ul>

          <button type="button" className={styles.submit} onClick={onGoLogin}>
            Перейти ко входу
            <Icon name="arrow_forward" size="sm" />
          </button>

          <p className={styles.register}>
            Уже есть ключи?{' '}
            <button type="button" className={styles.inlineLink} onClick={onGoLogin}>
              Войти в приложение
            </button>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
