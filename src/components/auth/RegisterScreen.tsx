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
          <header className={styles.header}>
            <h1 className={styles.title}>Регистрация</h1>
            <p className={styles.subtitle}>
              Аккаунт GREEN-API создаётся на официальном сайте — публичного API регистрации нет.
            </p>
          </header>

          <div
            className={styles.alertBanner}
            role="status"
            style={{
              background: 'var(--color-surface-container)',
              borderColor: 'var(--color-outline-variant)',
              color: 'var(--color-on-surface)',
              marginTop: 24,
            }}
          >
            <Icon name="info" />
            <span>
              Зарегистрируйтесь в{' '}
              <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
                console.green-api.com
              </a>
              , создайте инстанс (WhatsApp, Telegram или MAX) и скопируйте <code>idInstance</code> /{' '}
              <code>apiTokenInstance</code>. Для партнёрского режима запросите{' '}
              <code>partnerToken</code> у support@green-api.com.
            </span>
          </div>

          <ul className={styles.registerList}>
            <li>
              <strong>«По ключам инстанса»</strong> — добавление инстанса по idInstance и
              apiTokenInstance; инстансов может быть несколько.
            </li>
            <li>
              <strong>«Режим партнёра»</strong> — Partner API: getInstances, createInstance,
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
