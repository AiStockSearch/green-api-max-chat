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
    messageData?: { typeMessage?: string; textMessageData?: { textMessage?: string } }
  }
  if (row.typeWebhook !== 'incomingMessageReceived') {
    return null
  }
  const chatId = row.senderData?.chatId
  const text = row.messageData?.textMessageData?.textMessage?.trim()
  if (!chatId || !text || row.messageData?.typeMessage !== 'textMessage') {
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
  if (row.typeWebhook !== 'outgoingMessageStatus' || !row.idMessage) {
    return null
  }
  return { idMessage: String(row.idMessage), status: row.status }
}
