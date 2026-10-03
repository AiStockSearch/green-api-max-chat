import { checkWhatsapp } from '../greenApi'
import {
  aliasesFromCheckWhatsapp,
  buildWhatsAppQrPageUrl,
  parseWhatsAppNotification,
  qrErrorNeedsLogout,
  whatsappChatId,
} from '../whatsapp'
import type { MessengerAdapter } from './types'

export const whatsappAdapter: MessengerAdapter = {
  id: 'whatsapp',
  label: 'WhatsApp',
  resolveChatId: whatsappChatId,
  parseNotification: parseWhatsAppNotification,
  qrPageUrl: buildWhatsAppQrPageUrl,
  supportsPassword2fa: false,
  supportsPhoneCodeAuth: false,
  qrNeedsLogout: qrErrorNeedsLogout,
  async checkRecipient(credentials, chatId) {
    if (chatId.endsWith('@g.us')) {
      return { exists: true, aliases: [] }
    }
    const res = await checkWhatsapp(credentials, chatId)
    return {
      exists: res.existsWhatsapp !== false,
      aliases: aliasesFromCheckWhatsapp(chatId, res),
    }
  },
  newChatLabel: 'Номер телефона',
  newChatPlaceholder: '+7 (___) ___-__-__',
  newChatHint: 'Номер в международном формате (например +79990000000) или chatId …@c.us / …@g.us',
  qrHint:
    'WhatsApp: телефон → «Связанные устройства» → «Привязка устройства», отсканируйте QR. Код обновляется автоматически.',
}
