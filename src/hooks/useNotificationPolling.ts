import { useEffect, useRef } from 'react'
import { deleteNotification, receiveNotification } from '../api/greenApi'
import { parseNotificationFor } from '../api/messengerAdapter'
import type { GreenApiCredentials, ParsedChatMessage } from '../api/types'
import { GreenApiError } from '../api/types'

interface Options {
  credentials: GreenApiCredentials | null
  enabled: boolean
  onMessage: (message: ParsedChatMessage) => void
  onError: (error: string) => void
}

/**
 * Цикл ReceiveNotification → обработка → DeleteNotification.
 *
 * У каждого запуска эффекта свой цикл и свой флаг `cancelled`. Раньше общий `runningRef`
 * блокировал новый цикл, пока старый ждал ответа: после повторного запуска эффекта
 * (React StrictMode, смена объекта credentials) старый цикл завершался после первого ответа,
 * а новый так и не стартовал — входящие переставали приходить.
 */
export function useNotificationPolling({
  credentials,
  enabled,
  onMessage,
  onError,
}: Options): void {
  const onMessageRef = useRef(onMessage)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onMessageRef.current = onMessage
    onErrorRef.current = onError
  }, [onMessage, onError])

  const idInstance = credentials?.idInstance
  const apiTokenInstance = credentials?.apiTokenInstance
  const apiUrl = credentials?.apiUrl
  const messenger = credentials?.messenger

  useEffect(() => {
    if (!enabled || !idInstance || !apiTokenInstance || !apiUrl) {
      return
    }
    const creds: GreenApiCredentials = { idInstance, apiTokenInstance, apiUrl, messenger }
    let cancelled = false

    const loop = async () => {
      while (!cancelled) {
        let notification
        try {
          notification = await receiveNotification(creds, 5)
        } catch (err) {
          if (cancelled) return
          const message =
            err instanceof GreenApiError
              ? (err.details ?? err.message)
              : err instanceof Error
                ? err.message
                : 'Ошибка опроса уведомлений'
          onErrorRef.current(message)
          await sleep(3000)
          continue
        }

        // Эффект перезапущен, пока ждали ответа: уведомление не удаляем — его заберёт новый цикл
        if (cancelled || !notification) {
          continue
        }

        const parsed = parseNotificationFor(creds, notification.body)
        if (parsed) {
          onMessageRef.current(parsed)
        }

        try {
          await deleteNotification(creds, notification.receiptId)
        } catch {
          // Повторная обработка безопасна (дедуп по idMessage); не блокируем цикл
        }
      }
    }

    void loop()

    return () => {
      cancelled = true
    }
  }, [enabled, idInstance, apiTokenInstance, apiUrl, messenger])
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
