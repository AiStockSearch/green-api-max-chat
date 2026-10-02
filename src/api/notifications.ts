import type { IncomingWebhookBody, ParsedIncomingTextMessage } from './types'

export function parseIncomingTextMessage(
  body: IncomingWebhookBody,
): ParsedIncomingTextMessage | null {
  if (body.typeWebhook !== 'incomingMessageReceived') {
    return null
  }
  const chatId = body.senderData?.chatId
  if (!chatId) {
    return null
  }
  if (body.messageData?.typeMessage !== 'textMessage') {
    return null
  }
  const text = body.messageData.textMessageData?.textMessage?.trim()
  if (!text) {
    return null
  }
  return {
    chatId,
    text,
    idMessage: body.idMessage,
    timestamp: body.timestamp ? body.timestamp * 1000 : Date.now(),
    senderName: body.senderData?.senderName ?? body.senderData?.chatName,
    incoming: true,
  }
}

/** Нормализует chatId для сопоставления (убирает регистр, trim). */
export function normalizeChatIdKey(chatId: string): string {
  return chatId.trim().toLowerCase()
}

/** Сопоставляет входящее сообщение с локальным chatId (номер @c.us vs числовой ID). */
export function chatIdsMatch(storedChatId: string, incomingChatId: string): boolean {
  const a = normalizeChatIdKey(storedChatId)
  const b = normalizeChatIdKey(incomingChatId)
  if (a === b) {
    return true
  }
  const stripSuffix = (id: string) => id.replace(/@c\.us$/i, '')
  return stripSuffix(a) === stripSuffix(b)
}
