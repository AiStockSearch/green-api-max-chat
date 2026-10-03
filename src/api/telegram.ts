import { normalizePhone } from './chatId'
import type { GreenApiCredentials, IncomingWebhookBody, ParsedChatMessage } from './types'
import { extractWhatsAppText } from './whatsapp'

/**
 * chatId Telegram (GREEN-API):
 * - личный чат — числовой ID пользователя (`10000000`);
 * - по номеру телефона — `79876543210@c.us`;
 * - группа — отрицательный ID (`-10000000000000`).
 * Чтобы не путать длинный ID с номером, номер вводится с «+» (или уже с @c.us).
 */
export function telegramChatId(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('Укажите ID чата Telegram или номер с «+»')
  }
  if (trimmed.includes('@')) {
    const lower = trimmed.toLowerCase()
    if (/^\d{10,15}@c\.us$/.test(lower)) {
      return lower
    }
    throw new Error('Для Telegram допустим только суффикс @c.us (номер телефона)')
  }
  if (/^-\d{5,20}$/.test(trimmed)) {
    return trimmed
  }
  if (/^\d{5,20}$/.test(trimmed)) {
    return trimmed
  }
  if (trimmed.startsWith('+') || /^[\d\s()-]+$/.test(trimmed)) {
    const digits = normalizePhone(trimmed)
    if (digits.length < 10 || digits.length > 15) {
      throw new Error('Номер должен содержать от 10 до 15 цифр')
    }
    return `${digits}@c.us`
  }
  throw new Error('Неверный формат: ID чата (10000000), номер +79990000000 или ID группы -100…')
}

const INCOMING = 'incomingMessageReceived'
const OUTGOING = new Set(['outgoingMessageReceived', 'outgoingAPIMessageReceived'])

/** Разбор уведомления Telegram: textMessage → textMessageData.textMessage (+ исходящие). */
export function parseTelegramNotification(body: IncomingWebhookBody): ParsedChatMessage | null {
  const incoming = body.typeWebhook === INCOMING
  if (!incoming && !OUTGOING.has(body.typeWebhook)) {
    return null
  }
  const chatId = body.senderData?.chatId
  const text = extractWhatsAppText(body)
  if (!chatId || !text) {
    return null
  }
  const phoneRaw = body.senderData?.senderPhoneNumber
  const phone = phoneRaw != null ? String(phoneRaw).replace(/\D/g, '') : ''
  return {
    chatId: String(chatId),
    text,
    idMessage: body.idMessage,
    timestamp: body.timestamp ? body.timestamp * 1000 : Date.now(),
    senderName: incoming
      ? (body.senderData?.senderName ?? body.senderData?.chatName)
      : body.senderData?.chatName,
    ...(incoming && phone && phone !== '0' ? { senderPhone: phone } : {}),
    direction: incoming ? 'incoming' : 'outgoing',
  }
}

/** Страница QR Telegram: https://qr.green-api.com/waInstance{id}/{token}/telegram */
export function buildTelegramQrPageUrl(credentials: GreenApiCredentials): string {
  return `https://qr.green-api.com/waInstance${credentials.idInstance}/${credentials.apiTokenInstance}/telegram`
}

/** Номер для startAuthorization: только цифры, 10–15. */
export function telegramAuthPhone(input: string): number {
  const digits = normalizePhone(input)
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Номер телефона: 10–15 цифр в международном формате')
  }
  return Number(digits)
}

const TG_AUTH_REASONS: Record<string, string> = {
  already_registered: 'Инстанс уже авторизован',
  system_busy: 'Инстанс уже ждёт код или пароль',
  invalid_phone_number: 'Некорректный номер телефона',
  blocked_or_deleted: 'Номер заблокирован или аккаунт удалён',
  rate_limit_exceeded: 'Слишком много попыток, повторите позже',
  timeout_waiting_client: 'Сервера Telegram недоступны',
  connection_closed: 'Соединение разорвано',
  '2fa_required': 'Код верный, требуется пароль 2FA',
  invalid_password: 'Неверный пароль 2FA',
  verify_code_wrong: 'Неверный код',
  code_expired: 'Код просрочен',
  authorization_not_started: 'Сначала запросите код (startAuthorization)',
  timeout: 'Истекло время ожидания ответа Telegram',
}

/** Человекочитаемая причина ответа startAuthorization / sendAuthorizationCode. */
export function telegramAuthReasonText(reason: string | undefined): string {
  if (!reason) {
    return 'Ошибка авторизации'
  }
  return TG_AUTH_REASONS[reason] ?? reason
}
