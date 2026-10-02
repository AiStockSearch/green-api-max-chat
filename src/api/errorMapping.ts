import type { StoredMessage } from './types'
import { GreenApiError } from './types'

export interface LoginFieldErrors {
  banner: string | null
  idInstance: string | null
  apiTokenInstance: string | null
}

export type PollErrorKind = 'network' | 'cors' | 'auth' | 'generic'

const CREDENTIALS_BANNER =
  'Неверный idInstance или apiTokenInstance. Проверьте правильность введённых ключей доступа в личном кабинете GREEN-API.'

const CREDENTIALS_FIELD = 'Неверный idInstance или apiTokenInstance'

export function mapLoginError(err: unknown): LoginFieldErrors {
  if (!(err instanceof GreenApiError)) {
    return {
      banner: err instanceof Error ? err.message : 'Не удалось подключиться',
      idInstance: null,
      apiTokenInstance: null,
    }
  }

  if (err.status === 401 || err.status === 403) {
    return {
      banner: CREDENTIALS_BANNER,
      idInstance: CREDENTIALS_FIELD,
      apiTokenInstance: CREDENTIALS_FIELD,
    }
  }

  if (!err.status) {
    return {
      banner: err.message,
      idInstance: null,
      apiTokenInstance: null,
    }
  }

  const banner = [err.message, err.details].filter(Boolean).join(': ')
  return {
    banner,
    idInstance: null,
    apiTokenInstance: null,
  }
}

export function classifyPollError(message: string): PollErrorKind {
  const lower = message.toLowerCase()
  if (lower.includes('cors') || lower.includes('failed to fetch') || lower.includes('preflight')) {
    return 'cors'
  }
  if (
    lower.includes('сетевая') ||
    lower.includes('network') ||
    lower.includes('networkerror')
  ) {
    return 'network'
  }
  if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized')) {
    return 'auth'
  }
  return 'generic'
}

export function pollErrorBannerText(kind: PollErrorKind, retryInSec?: number): string {
  const suffix =
    retryInSec != null && retryInSec > 0 ? ` Повтор через ${retryInSec} сек…` : ''
  switch (kind) {
    case 'cors':
      return `Ошибка сети / CORS: запрос заблокирован политикой CORS или недоступен шлюз API.${suffix}`
    case 'network':
      return `Ошибка сети: не удалось связаться с GREEN-API.${suffix}`
    case 'auth':
      return `Ошибка авторизации при опросе уведомлений.${suffix}`
    default:
      return `Ошибка опроса уведомлений.${suffix}`
  }
}

export function isOutgoingPending(status: StoredMessage['status']): boolean {
  return status === 'sending'
}

export function isOutgoingFailed(status: StoredMessage['status']): boolean {
  return status === 'failed'
}

export function canRetryMessage(msg: StoredMessage): boolean {
  return msg.direction === 'outgoing' && msg.status === 'failed'
}

export interface PartnerFieldErrors {
  banner: string | null
  partnerToken: string | null
}

export function mapPartnerError(err: unknown): PartnerFieldErrors {
  if (!(err instanceof GreenApiError)) {
    return {
      banner: err instanceof Error ? err.message : 'Не удалось выполнить запрос',
      partnerToken: null,
    }
  }
  if (err.status === 401) {
    return {
      banner:
        'Неверный partnerToken. Ключ партнёра выдаётся через support@green-api.com (см. документацию Partner API).',
      partnerToken: 'Unauthorized',
    }
  }
  return {
    banner: [err.message, err.details].filter(Boolean).join(': '),
    partnerToken: null,
  }
}
