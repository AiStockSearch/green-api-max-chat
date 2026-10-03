import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  QR_REFRESH_MS,
  STATE_POLL_MS,
  resolveAuthPhase,
  shouldContinueStatePolling,
} from '../../api/instanceAuthPolling'
import { getMessenger, MESSENGER_LABELS } from '../../api/messenger'
import { qrPageUrlFor } from '../../api/messengerAdapter'
import { qrErrorNeedsLogout } from '../../api/whatsapp'
import {
  parseQrResponse,
  qrDataUrlFromMessage,
  isQrAlreadyAuthorized,
} from '../../api/qrAuth'
import {
  fetchInstanceQr,
  getStateInstance,
  logoutInstance,
  sendAuthorizationPassword,
} from '../../api/greenApi'
import { isInstanceAuthorized, parseStateInstance } from '../../api/instanceState'
import type { GreenApiCredentials } from '../../api/types'
import { isDemoMode } from '../../demo/demoMode'
import { Icon } from '../Icon'
import { SiteFooter } from '../layout/SiteFooter'
import { TopNavBar } from '../layout/TopNavBar'
import styles from './InstanceAuthScreen.module.css'

const DEMO_QR =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmNGY4Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMDA1OWMyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5RUiBNQVg8L3RleHQ+PC9zdmc+'

interface Props {
  credentials: GreenApiCredentials
  onAuthorized: () => void
  onBack: () => void
}

export function InstanceAuthScreen({ credentials, onAuthorized, onBack }: Props) {
  const [phase, setPhase] = useState<'checking' | 'qr' | 'pending_password' | 'authorized' | 'blocked' | 'error'>('checking')
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [statusText, setStatusText] = useState('Проверка состояния инстанса…')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [submittingPassword, setSubmittingPassword] = useState(false)
  const authorizedOnce = useRef(false)
  const messenger = getMessenger(credentials)
  const label = MESSENGER_LABELS[messenger]
  const isWhatsApp = messenger === 'whatsapp'
  const [needsLogout, setNeedsLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const refreshState = useCallback(async () => {
    if (isDemoMode()) {
      setPhase('qr')
      setQrSrc(DEMO_QR)
      setStatusText(`Демо: отсканируйте QR в ${label} (реальный вызов QR/getStateInstance).`)
      return
    }
    try {
      const state = parseStateInstance(await getStateInstance(credentials))
      const next = resolveAuthPhase(state)
      setPhase(next)
      if (isInstanceAuthorized(state)) {
        setStatusText('Инстанс авторизован')
        if (!authorizedOnce.current) {
          authorizedOnce.current = true
          onAuthorized()
        }
        return
      }
      if (next === 'pending_password') {
        setStatusText('Требуется пароль 2FA (SendAuthorizationPassword)')
      } else if (next === 'blocked') {
        setStatusText(`Аккаунт ${label} заблокирован (stateInstance: blocked)`)
      } else if (next === 'qr') {
        setStatusText(`Отсканируйте QR-код в приложении ${label}`)
      }
    } catch (err) {
      setPhase('error')
      setStatusText(err instanceof Error ? err.message : 'Ошибка getStateInstance')
    }
  }, [credentials, label, onAuthorized])

  const refreshQr = useCallback(async () => {
    if (isDemoMode()) {
      setQrSrc(DEMO_QR)
      return
    }
    try {
      const raw = await fetchInstanceQr(credentials)
      const parsed = parseQrResponse(raw)
      if (!parsed) {
        return
      }
      if (isQrAlreadyAuthorized(parsed.type)) {
        setStatusText('Инстанс уже авторизован')
        void refreshState()
        return
      }
      if (parsed.type === 'qrCode') {
        setNeedsLogout(false)
        setQrSrc(qrDataUrlFromMessage(parsed.message))
      } else if (parsed.type === 'error') {
        setStatusText(parsed.message || 'Ошибка QR')
        setNeedsLogout(isWhatsApp && qrErrorNeedsLogout(parsed.message))
      }
    } catch (err) {
      setStatusText(err instanceof Error ? err.message : 'Не удалось получить QR')
    }
  }, [credentials, isWhatsApp, refreshState])

  useEffect(() => {
    queueMicrotask(() => {
      void refreshState()
    })
  }, [refreshState])

  useEffect(() => {
    if (!shouldContinueStatePolling(phase)) {
      return undefined
    }
    const id = window.setInterval(() => {
      void refreshState()
    }, STATE_POLL_MS)
    return () => window.clearInterval(id)
  }, [phase, refreshState])

  useEffect(() => {
    if (phase !== 'qr' && phase !== 'checking') {
      return undefined
    }
    queueMicrotask(() => {
      void refreshQr()
    })
    const id = window.setInterval(() => {
      void refreshQr()
    }, QR_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [phase, refreshQr])

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setSubmittingPassword(true)
    if (isDemoMode()) {
      setSubmittingPassword(false)
      onAuthorized()
      return
    }
    try {
      const res = await sendAuthorizationPassword(credentials, password)
      if (res.status === 'success' || res.status === true) {
        onAuthorized()
        return
      }
      setPasswordError(res.reason ?? 'Не удалось отправить пароль (status fail)')
      void refreshState()
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Ошибка SendAuthorizationPassword')
    } finally {
      setSubmittingPassword(false)
    }
  }

  const handleLogoutInstance = async () => {
    setLoggingOut(true)
    try {
      await logoutInstance(credentials)
      setNeedsLogout(false)
      setStatusText('Logout выполнен — получаем новый QR…')
      void refreshQr()
    } catch (err) {
      setStatusText(err instanceof Error ? err.message : 'Ошибка Logout')
    } finally {
      setLoggingOut(false)
    }
  }

  const qrPage = qrPageUrlFor(credentials)

  return (
    <div className={styles.page} data-ui="instance-auth">
      <TopNavBar />
      <main className={styles.main}>
        <div className={styles.card}>
          <header className={styles.head}>
            <div>
              <h1 className={styles.title}>Авторизация инстанса {label}</h1>
              <p className={styles.sub}>
                idInstance {credentials.idInstance} · опрос getStateInstance
              </p>
            </div>
            <button type="button" className={styles.backBtn} onClick={onBack}>
              <Icon name="arrow_back" size="sm" />
              Назад
            </button>
          </header>

          <p className={styles.status}>{statusText}</p>

          {(phase === 'qr' || phase === 'checking') && (
            <div className={styles.qrBlock}>
              {qrSrc ? (
                <img
                  src={qrSrc}
                  alt={`QR-код для авторизации ${label}`}
                  className={styles.qrImg}
                  data-cy="qr-image"
                />
              ) : (
                <div className={styles.qrPlaceholder} data-cy="qr-placeholder">
                  Загрузка QR…
                </div>
              )}
              <a className={styles.qrLink} href={qrPage} target="_blank" rel="noreferrer">
                Открыть qr.green-api.com
              </a>
              {isWhatsApp ? (
                <p className={styles.hint}>
                  WhatsApp: телефон → «Связанные устройства» → «Привязка устройства», отсканируйте
                  QR. Код обновляется автоматически.
                </p>
              ) : (
                <p className={styles.hint}>
                  Документация рекомендует обновлять QR каждые ~5 сек. Для MAX: QR +
                  SendAuthorizationPassword при stateInstance pendingPassword.
                </p>
              )}
              {needsLogout && (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  data-cy="logout-instance"
                  disabled={loggingOut}
                  onClick={() => void handleLogoutInstance()}
                >
                  {loggingOut ? 'Logout…' : 'Logout инстанса и новый QR'}
                </button>
              )}
            </div>
          )}

          {phase === 'pending_password' && (
            <form className={styles.passwordForm} onSubmit={(e) => void handlePassword(e)}>
              <label htmlFor="max2fa">Пароль 2FA MAX</label>
              <input
                id="max2fa"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submittingPassword}
              />
              {passwordError && <p className={styles.error}>{passwordError}</p>}
              <button type="submit" className={styles.primaryBtn} disabled={submittingPassword}>
                SendAuthorizationPassword
              </button>
            </form>
          )}

          {phase === 'blocked' && (
            <p className={styles.error}>
              Инстанс заблокирован. См. getStateInstance: blocked в документации {label}.
            </p>
          )}

          {phase === 'error' && (
            <button type="button" className={styles.primaryBtn} onClick={() => void refreshState()}>
              Проверить снова
            </button>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
