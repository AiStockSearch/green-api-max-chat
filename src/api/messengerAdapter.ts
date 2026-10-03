import { resolveChatId } from './chatId'
import { getMessenger } from './messenger'
import { parseIncomingTextMessage } from './notifications'
import { buildQrPageUrl } from './qrAuth'
import type { GreenApiCredentials, IncomingWebhookBody, ParsedChatMessage } from './types'
import { buildWhatsAppQrPageUrl, parseWhatsAppNotification, whatsappChatId } from './whatsapp'

/** chatId для SendMessage с учётом мессенджера инстанса. */
export function resolveChatIdFor(credentials: GreenApiCredentials, input: string): string {
  return getMessenger(credentials) === 'whatsapp' ? whatsappChatId(input) : resolveChatId(input)
}

/** Разбор уведомления очереди: MAX — только входящие textMessage (как раньше), WhatsApp — входящие и исходящие. */
export function parseNotificationFor(
  credentials: GreenApiCredentials,
  body: IncomingWebhookBody,
): ParsedChatMessage | null {
  if (getMessenger(credentials) === 'whatsapp') {
    return parseWhatsAppNotification(body)
  }
  const parsed = parseIncomingTextMessage(body)
  if (!parsed) {
    return null
  }
  return {
    chatId: parsed.chatId,
    text: parsed.text,
    idMessage: parsed.idMessage,
    timestamp: parsed.timestamp,
    senderName: parsed.senderName,
    direction: 'incoming',
  }
}

export function qrPageUrlFor(credentials: GreenApiCredentials): string {
  return getMessenger(credentials) === 'whatsapp'
    ? buildWhatsAppQrPageUrl(credentials)
    : buildQrPageUrl(credentials)
}
