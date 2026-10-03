import { buildTelegramQrPageUrl, parseTelegramNotification, telegramChatId } from '../telegram'
import type { MessengerAdapter } from './types'

export const telegramAdapter: MessengerAdapter = {
  id: 'telegram',
  label: 'Telegram',
  resolveChatId: telegramChatId,
  parseNotification: parseTelegramNotification,
  qrPageUrl: buildTelegramQrPageUrl,
  supportsPassword2fa: true,
  supportsPhoneCodeAuth: true,
  qrNeedsLogout: () => false,
  newChatLabel: 'ID чата или номер',
  newChatPlaceholder: '10000000 или +79990000000',
  newChatHint: 'ID чата Telegram (10000000), номер с «+» (+79990000000) или ID группы (-100…)',
  qrHint:
    'Telegram: «Настройки → Устройства → Подключить устройство», отсканируйте QR. При облачном пароле введите его ниже. Есть вход по коду из Telegram.',
}
