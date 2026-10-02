import { useEffect, useState } from 'react'

/** Обратный отсчёт до следующей попытки опроса (сек). */
export function usePollRetryCountdown(active: boolean, seconds = 3): number {
  const [left, setLeft] = useState(0)

  useEffect(() => {
    if (!active) {
      return undefined
    }
    queueMicrotask(() => setLeft(seconds))
    const id = window.setInterval(() => {
      setLeft((v) => (v <= 1 ? seconds : v - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [active, seconds])

  return active ? left : 0
}
