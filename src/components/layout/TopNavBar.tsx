import { Icon } from '../Icon'
import styles from './TopNavBar.module.css'

interface AppNav {
  onLogin?: () => void
  onRegister?: () => void
  active?: 'login' | 'register'
}

interface Props {
  appNav?: AppNav
}

export function TopNavBar({ appNav }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brandCluster}>
          <div className={styles.logoMark}>
            <Icon name="chat" filled size="md" />
          </div>
          <span className={styles.brandName}>GREEN-API Chat</span>
          <div className={styles.statusPill}>
            <span className={styles.statusDot} />
            Серверы онлайн
          </div>
        </div>
        <nav className={styles.nav} aria-label="Навигация">
          <a className={styles.navLink} href="https://green-api.com/v3/docs/" target="_blank" rel="noreferrer">
            Документация
          </a>
          <a className={styles.navLink} href="https://green-api.com" target="_blank" rel="noreferrer">
            Тарифы
          </a>
          <a className={styles.navLink} href="https://green-api.com" target="_blank" rel="noreferrer">
            Поддержка
          </a>
          <a
            className={styles.navLinkActive}
            href="https://console.green-api.com"
            target="_blank"
            rel="noreferrer"
          >
            API Консоль
          </a>
        </nav>
        <div className={styles.actions}>
          {appNav?.onLogin ? (
            <button
              type="button"
              className={appNav.active === 'login' ? styles.linkBtnActive : styles.linkBtn}
              onClick={appNav.onLogin}
            >
              Войти
            </button>
          ) : (
            <a className={styles.linkBtn} href="https://console.green-api.com" target="_blank" rel="noreferrer">
              Войти
            </a>
          )}
          {appNav?.onRegister ? (
            <button
              type="button"
              className={appNav.active === 'register' ? styles.regBtnActive : styles.regBtn}
              onClick={appNav.onRegister}
            >
              Регистрация
            </button>
          ) : (
            <a className={styles.regBtn} href="https://console.green-api.com" target="_blank" rel="noreferrer">
              Регистрация
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
