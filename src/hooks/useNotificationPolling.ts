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

export function useNotificationPolling({
  credentials,
  enabled,
  onMessage,
  onError,
}: Options): void {
  const runningRef = useRef(false)
  const onMessageRef = useRef(onMessage)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onMessageRef.current = onMessage
    onErrorRef.current = onError
  }, [onMessage, onError])

  useEffect(() => {
    if (!credentials || !enabled) {
      return
    }

    let cancelled = false

    const loop = async () => {
      if (cancelled || runningRef.current) {
        return
      }
      runningRef.current = true
      try {
        while (!cancelled) {
          let notification
          try {
            notification = await receiveNotification(credentials, 5)
          } catch (err) {
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

          if (!notification) {
            continue
          }

          const parsed = parseNotificationFor(credentials, notification.body)
          if (parsed) {
            onMessageRef.current(parsed)
          }

          try {
            await deleteNotification(credentials, notification.receiptId)
          } catch {
            // Повторная обработка маловероятна; не блокируем цикл
          }
        }
      } finally {
        runningRef.current = false
      }
    }

    void loop()

    return () => {
      cancelled = true
    }
  }, [credentials, enabled])
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
