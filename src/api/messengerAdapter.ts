import { adapterFor } from './messengers'
import type { GreenApiCredentials, IncomingWebhookBody, ParsedChatMessage } from './types'

/** chatId для SendMessage с учётом мессенджера инстанса. */
export function resolveChatIdFor(credentials: GreenApiCredentials, input: string): string {
  return adapterFor(credentials).resolveChatId(input)
}

/** Разбор уведомления очереди адаптером мессенджера (MAX — только входящие textMessage, как раньше). */
export function parseNotificationFor(
  credentials: GreenApiCredentials,
  body: IncomingWebhookBody,
): ParsedChatMessage | null {
  return adapterFor(credentials).parseNotification(body)
}

export function qrPageUrlFor(credentials: GreenApiCredentials): string {
  return adapterFor(credentials).qrPageUrl(credentials)
}
