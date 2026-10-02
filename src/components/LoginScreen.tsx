import { useState } from 'react'
import type { FormEvent } from 'react'
import { mapLoginError, type LoginFieldErrors } from '../api/errorMapping'
import { DEFAULT_API_URL } from '../api/constants'
import { getStateInstance, normalizeApiUrl } from '../api/greenApi'
import { isInstanceAuthorized, parseStateInstance } from '../api/instanceState'
import type { GreenApiCredentials } from '../api/types'
import { GreenApiError } from '../api/types'
import { HelpCredentialsModal } from './HelpCredentialsModal'
import { Icon } from './Icon'
import { SiteFooter } from './layout/SiteFooter'
import { TopNavBar } from './layout/TopNavBar'
import styles from './LoginScreen.module.css'

interface Props {
  onSuccess: (credentials: GreenApiCredentials) => void
  /** Демо-экран login-error */
  demoShowErrors?: boolean
}

const emptyFieldErrors: LoginFieldErrors = {
  banner: null,
  idInstance: null,
  apiTokenInstance: null,
}

export function LoginScreen({ onSuccess, demoShowErrors }: Props) {
  const [idInstance, setIdInstance] = useState(() =>
    demoShowErrors ? '1101823456' : '',
  )
  const [apiTokenInstance, setApiTokenInstance] = useState(() =>
    demoShowErrors ? 'demo-wrong-token' : '',
  )
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
  const [remember, setRemember] = useState(true)
  const [showToken, setShowToken] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>(() =>
    demoShowErrors
      ? mapLoginError(new GreenApiError('Unauthorized', 401))
      : emptyFieldErrors,
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFieldErrors(emptyFieldErrors)
    const credentials: GreenApiCredentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl: normalizeApiUrl(apiUrl),
    }
    if (!credentials.idInstance || !credentials.apiTokenInstance) {
      setFieldErrors({
        banner: 'Укажите idInstance и apiTokenInstance',
        idInstance: !credentials.idInstance ? 'Обязательное поле' : null,
        apiTokenInstance: !credentials.apiTokenInstance ? 'Обязательное поле' : null,
      })
      return
    }
    setLoading(true)
    try {
      const stateRaw = await getStateInstance(credentials)
      const state = parseStateInstance(stateRaw)
      if (state && !isInstanceAuthorized(state)) {
        onSuccess(credentials)
        return
      }
      onSuccess(credentials)
    } catch (err) {
      setFieldErrors(mapLoginError(err))
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (hasError: boolean) =>
    `${styles.input} ${hasError ? styles.inputError : ''}`

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
            {fieldErrors.banner && (
              <div className={styles.alertBanner} role="alert">
                <Icon name="error" />
                {fieldErrors.banner}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="idInstance">idInstance</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>
                  <Icon name="tag" size="sm" />
                </span>
                <input
                  id="idInstance"
                  className={inputClass(Boolean(fieldErrors.idInstance))}
                  value={idInstance}
                  onChange={(e) => setIdInstance(e.target.value)}
                  placeholder="Например, 1101823456"
                  autoComplete="off"
                  disabled={loading}
                />
                {fieldErrors.idInstance && (
                  <span className={styles.inputErrorIcon}>
                    <Icon name="cancel" size="sm" />
                  </span>
                )}
              </div>
              {fieldErrors.idInstance && (
                <p className={styles.fieldError}>
                  <Icon name="warning" size="sm" />
                  {fieldErrors.idInstance}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="apiTokenInstance">apiTokenInstance</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>
                  <Icon name="key" size="sm" />
                </span>
                <input
                  id="apiTokenInstance"
                  className={`${inputClass(Boolean(fieldErrors.apiTokenInstance))} ${styles.inputMono}`}
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
              {fieldErrors.apiTokenInstance && (
                <p className={styles.fieldError}>
                  <Icon name="warning" size="sm" />
                  {fieldErrors.apiTokenInstance}
                </p>
              )}
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
