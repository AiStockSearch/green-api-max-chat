import type { Messenger } from '../messenger'
import type { GreenApiCredentials, IncomingWebhookBody, ParsedChatMessage } from '../types'

export interface RecipientCheck {
  /** false — аккаунта нет (чат не создаём) */
  exists: boolean
  /** альтернативные chatId (WhatsApp …@lid) */
  aliases: string[]
}

/**
 * Единый интерфейс мессенджера поверх GREEN-API.
 * HTTP-методы общие (src/api/greenApi.ts), различаются форматы chatId, уведомлений и авторизации.
 */
export interface MessengerAdapter {
  readonly id: Messenger
  readonly label: string
  /** Ввод пользователя (номер / ID) → chatId для SendMessage */
  resolveChatId(input: string): string
  /** Уведомление ReceiveNotification → текстовое сообщение чата (или null — игнорировать) */
  parseNotification(body: IncomingWebhookBody): ParsedChatMessage | null
  /** Страница qr.green-api.com для открытия в браузере */
  qrPageUrl(credentials: GreenApiCredentials): string
  /** stateInstance pendingPassword → SendAuthorizationPassword */
  readonly supportsPassword2fa: boolean
  /** Вход по коду: startAuthorization + sendAuthorizationCode (Telegram) */
  readonly supportsPhoneCodeAuth: boolean
  /** Ошибка QR требует Logout инстанса */
  qrNeedsLogout(message: string): boolean
  /** Проверка получателя перед созданием чата (WhatsApp: CheckWhatsapp) */
  checkRecipient?(credentials: GreenApiCredentials, chatId: string): Promise<RecipientCheck>
  readonly newChatLabel: string
  readonly newChatPlaceholder: string
  readonly newChatHint: string
  readonly qrHint: string
}
