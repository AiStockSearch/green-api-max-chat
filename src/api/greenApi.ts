import { reportNetworkFailure } from '../pwa/networkStatus'
import { normalizeApiUrl } from './apiUrl'
import { resolveDevProxyFetchUrl } from './devProxy'
import type { GreenApiCredentials, ReceiveNotificationResponse, SendMessageResponse } from './types'
import { GreenApiError } from './types'

export { normalizeApiUrl } from './apiUrl'

function instancePath(credentials: GreenApiCredentials, method: string): string {
  const base = normalizeApiUrl(credentials.apiUrl)
  return `${base}/waInstance${credentials.idInstance}/${method}/${credentials.apiTokenInstance}`
}

async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ data: T | null; response: Response }> {
  const fetchUrl = resolveDevProxyFetchUrl(url)
  let response: Response
  try {
    response = await fetch(fetchUrl, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch (cause) {
    reportNetworkFailure()
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
    throw new GreenApiError('Доступ запрещён (403). Проверьте idInstance и apiUrl.', 403)
  }

  const text = await response.text()
  if (!text) {
    if (!response.ok) {
      // например 429 Too Many Requests приходит с пустым телом — это ошибка, а не «нет данных»
      throw new GreenApiError(`Ошибка API (${response.status})`, response.status)
    }
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

export function instanceQrUrl(credentials: GreenApiCredentials): string {
  return instancePath(credentials, 'qr')
}

/** GET qr — ответ type/message (base64 PNG в message). */
export async function fetchInstanceQr(credentials: GreenApiCredentials): Promise<unknown> {
  const url = instanceQrUrl(credentials)
  const { data } = await requestJson<unknown>(url, { method: 'GET' })
  return data
}

export interface SendAuthorizationPasswordResult {
  status?: string | boolean
  reason?: string
}

/** POST sendAuthorizationPassword — 2FA после QR (MAX). */
export async function sendAuthorizationPassword(
  credentials: GreenApiCredentials,
  password: string,
): Promise<SendAuthorizationPasswordResult> {
  const url = instancePath(credentials, 'sendAuthorizationPassword')
  const { data } = await requestJson<SendAuthorizationPasswordResult>(url, {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  return data ?? {}
}

/** GET logout — разлогинить инстанс (нужно, если QR отвечает «Instance has auth. You need to make log out»). */
export async function logoutInstance(credentials: GreenApiCredentials): Promise<boolean> {
  const url = instancePath(credentials, 'logout')
  const { data } = await requestJson<{ isLogout?: boolean }>(url, { method: 'GET' })
  return Boolean(data?.isLogout)
}

export interface CheckWhatsappResponse {
  existsWhatsapp?: boolean
  /** lid найденного пользователя (…@lid) либо chatId по номеру */
  chatId?: string
  phoneNumber?: string
}

/** POST checkWhatsapp — проверка аккаунта WhatsApp и получение lid (WhatsApp). */
export async function checkWhatsapp(
  credentials: GreenApiCredentials,
  chatId: string,
): Promise<CheckWhatsappResponse> {
  const url = instancePath(credentials, 'checkWhatsapp')
  const { data } = await requestJson<CheckWhatsappResponse>(url, {
    method: 'POST',
    body: JSON.stringify({ chatId }),
  })
  return data ?? {}
}

export interface TelegramAuthResult {
  status?: boolean
  data?: { status?: string; reason?: string; retryAfter?: number }
}

/** POST startAuthorization — Telegram: запрос кода входа на номер (альтернатива QR). */
export async function startAuthorization(
  credentials: GreenApiCredentials,
  phoneNumber: number,
): Promise<TelegramAuthResult> {
  const url = instancePath(credentials, 'startAuthorization')
  const { data } = await requestJson<TelegramAuthResult>(url, {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  })
  return data ?? {}
}

/** POST sendAuthorizationCode — Telegram: код из SMS/системного чата (+ пароль 2FA при наличии). */
export async function sendAuthorizationCode(
  credentials: GreenApiCredentials,
  code: string,
  password?: string,
): Promise<TelegramAuthResult> {
  const url = instancePath(credentials, 'sendAuthorizationCode')
  const { data } = await requestJson<TelegramAuthResult>(url, {
    method: 'POST',
    body: JSON.stringify(password ? { code, password } : { code }),
  })
  return data ?? {}
}

/** Элемент ответа GetChatHistory (WhatsApp). */
export interface ChatHistoryItem {
  type?: 'incoming' | 'outgoing' | string
  idMessage?: string
  timestamp?: number
  typeMessage?: string
  chatId?: string
  senderId?: string
  senderName?: string
  senderContactName?: string
  textMessage?: string
  extendedTextMessage?: { text?: string }
}

/** POST getChatHistory — последние сообщения чата (WhatsApp), только чтение. */
export async function getChatHistory(
  credentials: GreenApiCredentials,
  chatId: string,
  count = 50,
): Promise<ChatHistoryItem[]> {
  const url = instancePath(credentials, 'getChatHistory')
  const { data } = await requestJson<ChatHistoryItem[]>(url, {
    method: 'POST',
    body: JSON.stringify({ chatId, count }),
  })
  return Array.isArray(data) ? data : []
}
