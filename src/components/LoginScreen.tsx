import { useState } from 'react'
import type { FormEvent } from 'react'
import { offerPasswordManagerSave } from '../api/credentialsStore'
import { DEFAULT_API_URL } from '../api/constants'
import { mapLoginError, mapPartnerError, type LoginFieldErrors } from '../api/errorMapping'
import { getStateInstance, normalizeApiUrl } from '../api/greenApi'
import { isInstanceAuthorized, parseStateInstance } from '../api/instanceState'
import type { PartnerCredentials } from '../api/partnerApi'
import { getInstances } from '../api/partnerApi'
import type { GreenApiCredentials } from '../api/types'
import { GreenApiError } from '../api/types'
import { DEFAULT_MESSENGER, MESSENGER_LABELS, type Messenger } from '../api/messenger'
import { AccountModeSwitcher, type AccountMode } from './auth/AccountModeSwitcher'
import { MessengerSwitcher } from './auth/MessengerSwitcher'
import { HelpCredentialsModal } from './HelpCredentialsModal'
import { Icon } from './Icon'
import { SiteFooter } from './layout/SiteFooter'
import { TopNavBar } from './layout/TopNavBar'
import styles from './LoginScreen.module.css'

interface Props {
  onInstanceSuccess: (
    credentials: GreenApiCredentials,
    remember: boolean,
    needsAuth: boolean,
  ) => void
  onPartnerSuccess: (partner: PartnerCredentials, remember: boolean) => void
  onGoRegister: () => void
  initialMode?: AccountMode
  demoShowErrors?: boolean
}

const emptyFieldErrors: LoginFieldErrors = {
  banner: null,
  idInstance: null,
  apiTokenInstance: null,
}

export function LoginScreen({
  onInstanceSuccess,
  onPartnerSuccess,
  onGoRegister,
  initialMode = 'instance',
  demoShowErrors,
}: Props) {
  const [mode, setMode] = useState<AccountMode>(initialMode)
  const [messenger, setMessenger] = useState<Messenger>(DEFAULT_MESSENGER)
  const [idInstance, setIdInstance] = useState(() =>
    demoShowErrors ? '1101823456' : '',
  )
  const [apiTokenInstance, setApiTokenInstance] = useState(() =>
    demoShowErrors ? 'demo-wrong-token' : '',
  )
  const [partnerToken, setPartnerToken] = useState('')
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
  const [partnerApiUrl, setPartnerApiUrl] = useState(DEFAULT_API_URL)
  const [remember, setRemember] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>(() =>
    demoShowErrors
      ? mapLoginError(new GreenApiError('Unauthorized', 401))
      : emptyFieldErrors,
  )
  const [partnerBanner, setPartnerBanner] = useState<string | null>(null)

  const handleInstanceSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFieldErrors(emptyFieldErrors)
    const credentials: GreenApiCredentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl: normalizeApiUrl(apiUrl),
      messenger,
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
      const needsAuth = Boolean(state && !isInstanceAuthorized(state))
      await offerPasswordManagerSave({
        username: credentials.idInstance,
        password: credentials.apiTokenInstance,
        name: `GREEN-API ${MESSENGER_LABELS[messenger]} · инстанс`,
      })
      onInstanceSuccess(credentials, remember, needsAuth)
    } catch (err) {
      setFieldErrors(mapLoginError(err))
    } finally {
      setLoading(false)
    }
  }

  const handlePartnerSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPartnerBanner(null)
    const partner: PartnerCredentials = {
      partnerToken: partnerToken.trim(),
      partnerApiUrl: normalizeApiUrl(partnerApiUrl),
    }
    if (!partner.partnerToken) {
      setPartnerBanner('Укажите partnerToken')
      return
    }
    setLoading(true)
    try {
      await getInstances(partner)
      await offerPasswordManagerSave({
        username: 'green-api-partner',
        password: partner.partnerToken,
        name: 'GREEN-API Partner',
      })
      onPartnerSuccess(partner, remember)
    } catch (err) {
      setPartnerBanner(mapPartnerError(err).banner)
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
      <TopNavBar appNav={{ onRegister: onGoRegister, active: 'login' }} />
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.brandBlock}>
            <div className={styles.badge}>
              <Icon name="forum" filled size="sm" />
              GREEN-API MAX
            </div>
            <h1 className={styles.title}>Вход</h1>
            <p className={styles.subtitle}>
              Вход в личный кабинет — на{' '}
              <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
                console.green-api.com
              </a>
              . Здесь — подключение инстанса или Partner API.
            </p>
          </div>

          <div data-cy="account-mode-switcher">
            <AccountModeSwitcher mode={mode} onChange={setMode} disabled={loading} />
          </div>

          {mode === 'instance' ? (
            <form
              className={styles.form}
              data-cy="form-instance"
              onSubmit={(e) => void handleInstanceSubmit(e)}
              autoComplete="on"
            >
              {fieldErrors.banner && (
                <div className={styles.alertBanner} role="alert">
                  <Icon name="error" />
                  {fieldErrors.banner}
                </div>
              )}

              <div className={styles.field} data-cy="messenger-switcher">
                <label>Мессенджер</label>
                <MessengerSwitcher value={messenger} onChange={setMessenger} disabled={loading} />
                {messenger === 'whatsapp' && (
                  <p className={styles.hint}>
                    WhatsApp — допустимый по ТЗ вариант, если MAX недоступен. Те же методы GREEN-API,
                    chatId вида 79990000000@c.us.
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="idInstance">idInstance</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>
                    <Icon name="tag" size="sm" />
                  </span>
                  <input
                    id="idInstance"
                    name="username"
                    className={inputClass(Boolean(fieldErrors.idInstance))}
                    value={idInstance}
                    onChange={(e) => setIdInstance(e.target.value)}
                    placeholder="Например, 1101823456"
                    autoComplete="username"
                    disabled={loading}
                  />
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
                    name="password"
                    className={`${inputClass(Boolean(fieldErrors.apiTokenInstance))} ${styles.inputMono}`}
                    type={showToken ? 'text' : 'password'}
                    value={apiTokenInstance}
                    onChange={(e) => setApiTokenInstance(e.target.value)}
                    placeholder="Введите токен инстанса"
                    autoComplete="current-password"
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
                  Скопируйте из кабинета (например https://7107.api.greenapi.com). В dev прокси Vite
                  обходит CORS автоматически.
                </p>
              </div>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  data-cy="remember-instance"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Запомнить ключи (localStorage). По умолчанию — только сессия вкладки.
              </label>

              <button
                type="submit"
                data-cy="submit-instance"
                className={styles.submit}
                disabled={loading}
              >
                {loading ? 'Проверка…' : 'Войти'}
                {!loading && <Icon name="arrow_forward" size="sm" />}
              </button>
            </form>
          ) : (
            <form
              className={styles.form}
              onSubmit={(e) => void handlePartnerSubmit(e)}
              autoComplete="on"
            >
              {partnerBanner && (
                <div className={styles.alertBanner} role="alert">
                  <Icon name="error" />
                  {partnerBanner}
                </div>
              )}

              <div className={styles.field}>
                <label htmlFor="partnerToken">partnerToken</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>
                    <Icon name="key" size="sm" />
                  </span>
                  <input
                    id="partnerUsername"
                    name="username"
                    className={styles.visuallyHidden}
                    value="green-api-partner"
                    readOnly
                    autoComplete="username"
                    tabIndex={-1}
                    aria-hidden
                  />
                  <input
                    id="partnerToken"
                    name="password"
                    className={styles.input}
                    type={showToken ? 'text' : 'password'}
                    value={partnerToken}
                    onChange={(e) => setPartnerToken(e.target.value)}
                    placeholder="gac.…"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="partnerApiUrl">partnerApiUrl</label>
                <input
                  id="partnerApiUrl"
                  className={styles.input}
                  value={partnerApiUrl}
                  onChange={(e) => setPartnerApiUrl(e.target.value)}
                  placeholder={DEFAULT_API_URL}
                  autoComplete="off"
                  disabled={loading}
                />
              </div>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Запомнить partnerToken (только для тестов; в проде нужен backend-прокси).
              </label>

              <button type="submit" className={styles.submit} disabled={loading}>
                {loading ? 'Проверка getInstances…' : 'Продолжить'}
                {!loading && <Icon name="arrow_forward" size="sm" />}
              </button>
            </form>
          )}

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
            Нет аккаунта GREEN-API?{' '}
            <button type="button" className={styles.inlineLink} onClick={onGoRegister}>
              Регистрация
            </button>{' '}
            ·{' '}
            <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
              console.green-api.com
            </a>
          </p>
        </div>
      </main>
      <SiteFooter />
      <HelpCredentialsModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
