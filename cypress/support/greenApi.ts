import type { InstanceCredentialsEnv } from './commands'

export function directApiBase(creds: InstanceCredentialsEnv): string {
  const direct = Cypress.env('apiUrlDirect') as string | undefined
  const raw = direct && String(direct).trim() ? String(direct) : creds.apiUrl
  return raw.replace(/\/+$/, '')
}

export function instanceApiUrl(
  creds: InstanceCredentialsEnv,
  method: string,
  suffix = '',
): string {
  return `${directApiBase(creds)}/waInstance${creds.idInstance}/${method}/${creds.apiTokenInstance}${suffix}`
}

export function parseIncomingText(body: unknown): { chatId: string; text: string } | null {
  if (typeof body !== 'object' || body === null) {
    return null
  }
  const row = body as {
    typeWebhook?: string
    senderData?: { chatId?: string }
    messageData?: {
      typeMessage?: string
      textMessageData?: { textMessage?: string }
      extendedTextMessageData?: { text?: string }
    }
  }
  if (row.typeWebhook !== 'incomingMessageReceived') {
    return null
  }
  const chatId = row.senderData?.chatId
  const type = row.messageData?.typeMessage
  // MAX/WhatsApp: textMessage; WhatsApp: extendedTextMessage / quotedMessage
  const raw =
    type === 'textMessage'
      ? row.messageData?.textMessageData?.textMessage
      : type === 'extendedTextMessage' || type === 'quotedMessage'
        ? row.messageData?.extendedTextMessageData?.text
        : undefined
  const text = raw?.trim()
  if (!chatId || !text) {
    return null
  }
  return { chatId, text }
}

export function parseOutgoingMessageStatus(
  body: unknown,
): { idMessage: string; status?: string } | null {
  if (typeof body !== 'object' || body === null) {
    return null
  }
  const row = body as { typeWebhook?: string; idMessage?: string; status?: string }
  if (!row.idMessage) {
    return null
  }
  if (row.typeWebhook === 'outgoingMessageStatus') {
    return { idMessage: String(row.idMessage), status: row.status }
  }
  // WhatsApp: при включённых уведомлениях об исходящих приходит outgoingAPIMessageReceived
  if (row.typeWebhook === 'outgoingAPIMessageReceived') {
    return { idMessage: String(row.idMessage), status: 'outgoingAPIMessageReceived' }
  }
  return null
}
