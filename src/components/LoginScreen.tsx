import { useState } from 'react'
import type { FormEvent } from 'react'
import { DEFAULT_API_URL } from '../api/constants'
import { getState, normalizeApiUrl } from '../api/greenApi'
import type { GreenApiCredentials } from '../api/types'
import { GreenApiError } from '../api/types'
import { HelpCredentialsModal } from './HelpCredentialsModal'
import { Icon } from './Icon'
import { SiteFooter } from './layout/SiteFooter'
import { TopNavBar } from './layout/TopNavBar'
import styles from './LoginScreen.module.css'

interface Props {
  onSuccess: (credentials: GreenApiCredentials) => void
}

export function LoginScreen({ onSuccess }: Props) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
  const [remember, setRemember] = useState(true)
  const [showToken, setShowToken] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const credentials: GreenApiCredentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl: normalizeApiUrl(apiUrl),
    }
    if (!credentials.idInstance || !credentials.apiTokenInstance) {
      setError('Укажите idInstance и apiTokenInstance')
      return
    }
    setLoading(true)
    try {
      await getState(credentials)
      if (remember) {
        onSuccess(credentials)
      } else {
        onSuccess(credentials)
      }
    } catch (err) {
      setError(
        err instanceof GreenApiError
          ? [err.message, err.details].filter(Boolean).join(': ')
          : err instanceof Error
            ? err.message
            : 'Не удалось подключиться',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page} data-ui="login-screen">
      <div className={styles.backdrop} aria-hidden>
        <div className={styles.glowTop} />
      </div>
      <TopNavBar />
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.brandBlock}>
            <div className={styles.badge}>
              <Icon name="forum" filled size="sm" />
              GREEN-API MAX
            </div>
            <h1 className={styles.title}>Вход в MAX</h1>
            <p className={styles.subtitle}>
              Введите параметры инстанса для подключения к мессенджеру
            </p>
          </div>

          <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
            <div className={styles.field}>
              <label htmlFor="idInstance">idInstance</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>
                  <Icon name="tag" size="sm" />
                </span>
                <input
                  id="idInstance"
                  className={styles.input}
                  value={idInstance}
                  onChange={(e) => setIdInstance(e.target.value)}
                  placeholder="Например, 1101823456"
                  autoComplete="off"
                  disabled={loading}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="apiTokenInstance">apiTokenInstance</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>
                  <Icon name="key" size="sm" />
                </span>
                <input
                  id="apiTokenInstance"
                  className={`${styles.input} ${styles.inputMono}`}
                  type={showToken ? 'text' : 'password'}
                  value={apiTokenInstance}
                  onChange={(e) => setApiTokenInstance(e.target.value)}
                  placeholder="Введите токен инстанса"
                  autoComplete="off"
                  disabled={loading}
                />
                <button
                  type="button"
                  className={styles.toggleToken}
                  aria-label="Показать или скрыть токен"
                  onClick={() => setShowToken((v) => !v)}
                >
                  <Icon name={showToken ? 'visibility_off' : 'visibility'} size="sm" />
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="apiUrl">API URL</label>
                <span className={styles.optional}>Необязательно</span>
              </div>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>
                  <Icon name="dns" size="sm" />
                </span>
                <input
                  id="apiUrl"
                  className={styles.input}
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder={DEFAULT_API_URL}
                  autoComplete="off"
                  disabled={loading}
                />
              </div>
              <p className={styles.hint}>
                Оставьте по умолчанию, если используете стандартный сервер
              </p>
            </div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Запомнить инстанс на этом устройстве
            </label>

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? 'Авторизация…' : 'Войти'}
              {!loading && <Icon name="arrow_forward" size="sm" />}
            </button>
          </form>

          <div className={styles.helpLink}>
            <button type="button" className={styles.helpBtn} onClick={() => setHelpOpen(true)}>
              <Icon name="help" size="sm" />
              Где взять данные?
            </button>
          </div>

          <div className={styles.divider}>
            <span>или</span>
          </div>

          <p className={styles.register}>
            Нет аккаунта?{' '}
            <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
              Зарегистрироваться в GREEN-API
            </a>
          </p>

          <div className={styles.trust}>
            <span className={styles.trustItem}>
              <Icon name="lock" size="sm" /> Прямое SSL-подключение
            </span>
            <span className={styles.trustItem}>
              <Icon name="verified_user" size="sm" /> Официальный API шлюз
            </span>
          </div>
        </div>
      </main>
      <SiteFooter />
      <HelpCredentialsModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
