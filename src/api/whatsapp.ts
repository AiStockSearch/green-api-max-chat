import { normalizePhone } from './chatId'
import type { ChatHistoryItem } from './greenApi'
import type { GreenApiCredentials, IncomingWebhookBody, ParsedChatMessage } from './types'

/** Суффиксы chatId WhatsApp: личный чат и группа. */
export const WA_PERSONAL_SUFFIX = '@c.us'
export const WA_GROUP_SUFFIX = '@g.us'
/** lid — системный идентификатор личного чата WhatsApp (приходит в вебхуках при lid-режиме). */
export const WA_LID_SUFFIX = '@lid'

/**
 * chatId WhatsApp (GREEN-API v1): `{номер в международном формате}@c.us`
 * для личного чата, `…@g.us` — для группы. Числовых ID чатов, как в MAX, нет.
 */
export function whatsappChatId(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('Укажите номер телефона')
  }
  const lower = trimmed.toLowerCase()
  if (
    lower.endsWith(WA_PERSONAL_SUFFIX) ||
    lower.endsWith(WA_GROUP_SUFFIX) ||
    lower.endsWith(WA_LID_SUFFIX)
  ) {
    const [local] = lower.split('@')
    if (!local) {
      throw new Error('Некорректный chatId WhatsApp')
    }
    return lower
  }
  if (trimmed.includes('@')) {
    throw new Error('chatId WhatsApp должен оканчиваться на @c.us, @g.us или @lid')
  }
  const digits = normalizePhone(trimmed)
  if (!digits) {
    throw new Error('Укажите номер телефона')
  }
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Номер должен содержать от 10 до 15 цифр (международный формат)')
  }
  return `${digits}${WA_PERSONAL_SUFFIX}`
}

const INCOMING_TYPES = new Set(['incomingMessageReceived'])
/** outgoingMessageReceived — отправлено с телефона; outgoingAPIMessageReceived — через API. */
const OUTGOING_TYPES = new Set(['outgoingMessageReceived', 'outgoingAPIMessageReceived'])

/** Текст из messageData: textMessage → textMessageData, extendedTextMessage/quotedMessage → extendedTextMessageData. */
export function extractWhatsAppText(body: IncomingWebhookBody): string | null {
  const data = body.messageData
  if (!data) {
    return null
  }
  let text: string | undefined
  switch (data.typeMessage) {
    case 'textMessage':
      text = data.textMessageData?.textMessage
      break
    case 'extendedTextMessage':
    case 'quotedMessage':
      text = data.extendedTextMessageData?.text
      break
    default:
      return null
  }
  const trimmed = text?.trim()
  return trimmed ? trimmed : null
}

/** Разбор уведомления WhatsApp (ReceiveNotification) в текстовое сообщение чата. */
export function parseWhatsAppNotification(body: IncomingWebhookBody): ParsedChatMessage | null {
  const incoming = INCOMING_TYPES.has(body.typeWebhook)
  const outgoing = OUTGOING_TYPES.has(body.typeWebhook)
  if (!incoming && !outgoing) {
    return null
  }
  const chatId = body.senderData?.chatId
  if (!chatId) {
    return null
  }
  const text = extractWhatsAppText(body)
  if (!text) {
    return null
  }
  return {
    chatId,
    text,
    idMessage: body.idMessage,
    timestamp: body.timestamp ? body.timestamp * 1000 : Date.now(),
    senderName: incoming
      ? (body.senderData?.senderName ?? body.senderData?.chatName)
      : body.senderData?.chatName,
    direction: incoming ? 'incoming' : 'outgoing',
  }
}

/** Страница QR из документации WhatsApp: https://qr.green-api.com/waInstance{id}/{token} */
export function buildWhatsAppQrPageUrl(credentials: GreenApiCredentials): string {
  return `https://qr.green-api.com/waInstance${credentials.idInstance}/${credentials.apiTokenInstance}`
}

/** QR вернул error «Instance has auth. You need to make log out» → нужен Logout. */
export function qrErrorNeedsLogout(message: string): boolean {
  return /log\s*out/i.test(message)
}

/**
 * Алиасы чата по ответу CheckWhatsapp: если API вернул другой chatId (например …@lid),
 * входящие с этим id попадут в тот же чат.
 */
export function aliasesFromCheckWhatsapp(
  chatId: string,
  response: { chatId?: string } | null | undefined,
): string[] {
  const alt = response?.chatId?.trim().toLowerCase()
  if (!alt || alt === chatId.trim().toLowerCase()) {
    return []
  }
  return [alt]
}

/** Чат совпадает по основному chatId или по одному из алиасов (@lid). */
export function chatMatchesId(
  chat: { chatId: string; aliases?: string[] },
  incomingChatId: string,
  match: (a: string, b: string) => boolean,
): boolean {
  if (match(chat.chatId, incomingChatId)) {
    return true
  }
  return (chat.aliases ?? []).some((a) => match(a, incomingChatId))
}

/**
 * Элемент GetChatHistory → текстовое сообщение чата (или null для медиа/служебных).
 * Нужен, чтобы при открытии чата показать переписку, отправленную/полученную до запуска приложения
 * (уведомления из очереди приходят только один раз).
 */
export function parseWhatsAppHistoryItem(
  item: ChatHistoryItem,
  chatId: string,
): ParsedChatMessage | null {
  if (item.type !== 'incoming' && item.type !== 'outgoing') {
    return null
  }
  const raw =
    item.typeMessage === 'textMessage'
      ? item.textMessage
      : item.typeMessage === 'extendedTextMessage' || item.typeMessage === 'quotedMessage'
        ? (item.extendedTextMessage?.text ?? item.textMessage)
        : undefined
  const text = raw?.trim()
  if (!text) {
    return null
  }
  return {
    chatId: item.chatId ?? chatId,
    text,
    idMessage: item.idMessage,
    timestamp: item.timestamp ? item.timestamp * 1000 : undefined,
    senderName: item.type === 'incoming' ? (item.senderName ?? item.senderContactName) : undefined,
    direction: item.type,
  }
}
