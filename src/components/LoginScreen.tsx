import { useState } from 'react'
import type { FormEvent } from 'react'
import { DEFAULT_API_URL } from '../api/constants'
import { getState, normalizeApiUrl } from '../api/greenApi'
import type { GreenApiCredentials } from '../api/types'
import { GreenApiError } from '../api/types'
import ui from '../styles/ui.module.css'
import styles from './LoginScreen.module.css'

interface Props {
  onSuccess: (credentials: GreenApiCredentials) => void
}

export function LoginScreen({ onSuccess }: Props) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
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
      onSuccess(credentials)
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
      <form className={styles.card} onSubmit={(e) => void handleSubmit(e)}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            MAX
          </span>
          <h1>Чат GREEN-API</h1>
          <p className={styles.subtitle}>
            Отправка и приём текстовых сообщений через HTTP API мессенджера MAX
          </p>
        </div>

        <label className={styles.field}>
          <span className={ui.fieldLabel}>idInstance</span>
          <input
            className={ui.textInput}
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            placeholder="3100000001"
            autoComplete="off"
            disabled={loading}
          />
        </label>

        <label className={styles.field}>
          <span className={ui.fieldLabel}>apiTokenInstance</span>
          <input
            className={ui.textInput}
            type="password"
            value={apiTokenInstance}
            onChange={(e) => setApiTokenInstance(e.target.value)}
            placeholder="Ключ из личного кабинета"
            autoComplete="off"
            disabled={loading}
          />
        </label>

        <label className={styles.field}>
          <span className={ui.fieldLabel}>apiUrl (хост API)</span>
          <input
            className={ui.textInput}
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder={DEFAULT_API_URL}
            autoComplete="off"
            disabled={loading}
          />
          <span className={ui.fieldHint}>
            Значение из личного кабинета; для инстанса может отличаться от api.green-api.com.
          </span>
        </label>

        {error && <div className={ui.errorBanner}>{error}</div>}

        <button type="submit" className={ui.primaryButton} disabled={loading}>
          {loading ? 'Проверка…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
