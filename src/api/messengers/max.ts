import { resolveChatId } from '../chatId'
import { parseIncomingTextMessage } from '../notifications'
import { buildQrPageUrl } from '../qrAuth'
import type { MessengerAdapter } from './types'

/** MAX — поведение как в исходной версии приложения. */
export const maxAdapter: MessengerAdapter = {
  id: 'max',
  label: 'MAX',
  resolveChatId,
  parseNotification(body) {
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
  },
  qrPageUrl: buildQrPageUrl,
  supportsPassword2fa: true,
  supportsPhoneCodeAuth: false,
  qrNeedsLogout: () => false,
  newChatLabel: 'Номер телефона',
  newChatPlaceholder: '+7 (___) ___-__-__',
  newChatHint: 'Введите номер в формате +7XXXXXXXXXX',
  qrHint:
    'Документация рекомендует обновлять QR каждые ~5 сек. Для MAX: QR + SendAuthorizationPassword при stateInstance pendingPassword.',
}
