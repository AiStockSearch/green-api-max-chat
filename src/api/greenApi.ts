import { DEFAULT_API_URL } from './constants'
import type {
  GreenApiCredentials,
  ReceiveNotificationResponse,
  SendMessageResponse,
} from './types'
import { GreenApiError } from './types'

export function normalizeApiUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '')
  if (!trimmed) {
    return DEFAULT_API_URL
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`
  }
  return trimmed
}

function instancePath(credentials: GreenApiCredentials, method: string): string {
  const base = normalizeApiUrl(credentials.apiUrl)
  return `${base}/waInstance${credentials.idInstance}/${method}/${credentials.apiTokenInstance}`
}

async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ data: T | null; response: Response }> {
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch (cause) {
    const msg =
      cause instanceof Error && cause.message.toLowerCase().includes('fetch')
        ? 'Сетевая ошибка / CORS: TypeError: Failed to fetch. Проверьте apiUrl и доступ из браузера.'
        : 'Сетевая ошибка. Проверьте интернет и адрес API (apiUrl).'
    throw new GreenApiError(msg)
  }

  if (response.status === 401) {
    throw new GreenApiError('Неверный apiTokenInstance (401 Unauthorized)', 401)
  }
  if (response.status === 403) {
    throw new GreenApiError(
      'Доступ запрещён (403). Проверьте idInstance и apiUrl.',
      403,
    )
  }

  const text = await response.text()
  if (!text) {
    return { data: null, response }
  }

  let data: T
  try {
    data = JSON.parse(text) as T
  } catch {
    if (!response.ok) {
      throw new GreenApiError(`Ошибка API: ${text}`, response.status)
    }
    throw new GreenApiError('Не удалось разобрать ответ сервера')
  }

  if (!response.ok) {
    const details =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message: unknown }).message)
        : text
    throw new GreenApiError(`Ошибка API (${response.status})`, response.status, details)
  }

  return { data, response }
}

/** Состояние инстанса (GetStateInstance). */
export async function getStateInstance(credentials: GreenApiCredentials): Promise<unknown> {
  const url = instancePath(credentials, 'getStateInstance')
  const { data } = await requestJson<unknown>(url, { method: 'GET' })
  return data
}

/** @deprecated используйте getStateInstance */
export async function getState(credentials: GreenApiCredentials): Promise<unknown> {
  return getStateInstance(credentials)
}

export async function sendMessage(
  credentials: GreenApiCredentials,
  chatId: string,
  message: string,
): Promise<SendMessageResponse> {
  const url = instancePath(credentials, 'sendMessage')
  const { data } = await requestJson<SendMessageResponse>(url, {
    method: 'POST',
    body: JSON.stringify({ chatId, message }),
  })
  if (!data?.idMessage) {
    throw new GreenApiError('Ответ SendMessage без idMessage')
  }
  return data
}

export async function receiveNotification(
  credentials: GreenApiCredentials,
  receiveTimeout = 5,
): Promise<ReceiveNotificationResponse | null> {
  const url = `${instancePath(credentials, 'receiveNotification')}?receiveTimeout=${receiveTimeout}`
  const { data, response } = await requestJson<ReceiveNotificationResponse>(url, {
    method: 'GET',
  })
  if (data?.receiptId != null && data.body) {
    return data
  }
  if (response.status === 200 && !data) {
    return null
  }
  return data
}

export async function deleteNotification(
  credentials: GreenApiCredentials,
  receiptId: number,
): Promise<boolean> {
  const url = `${instancePath(credentials, 'deleteNotification')}/${receiptId}`
  const { data } = await requestJson<{ result?: boolean }>(url, { method: 'DELETE' })
  return Boolean(data?.result)
}
