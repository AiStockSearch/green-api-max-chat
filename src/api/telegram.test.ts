import { describe, expect, it } from 'vitest'
import {
  buildTelegramQrPageUrl,
  parseTelegramNotification,
  telegramAuthPhone,
  telegramAuthReasonText,
  telegramChatId,
} from './telegram'
import type { IncomingWebhookBody } from './types'

describe('telegramChatId', () => {
  it('числовой ID личного чата остаётся как есть (даже длинный)', () => {
    expect(telegramChatId('10000000')).toBe('10000000')
    expect(telegramChatId('1234567890')).toBe('1234567890')
  })

  it('номер с «+» или форматированием → @c.us', () => {
    expect(telegramChatId('+7 (999) 000-00-00')).toBe('79990000000@c.us')
    expect(telegramChatId('+79990000000')).toBe('79990000000@c.us')
    expect(telegramChatId('79990000000@C.US')).toBe('79990000000@c.us')
  })

  it('отрицательный ID группы', () => {
    expect(telegramChatId('-10000000000000')).toBe('-10000000000000')
  })

  it('ошибки: пусто, @g.us/@lid, буквы, короткий номер', () => {
    expect(() => telegramChatId(' ')).toThrow()
    expect(() => telegramChatId('123@g.us')).toThrow()
    expect(() => telegramChatId('1@lid')).toThrow()
    expect(() => telegramChatId('@username')).toThrow()
    expect(() => telegramChatId('+7999')).toThrow()
  })
})

const personal: IncomingWebhookBody = {
  typeWebhook: 'incomingMessageReceived',
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatType: 'user',
    sender: '10000000',
    chatName: 'Василиса Премудрая',
    senderName: 'Василиса',
    senderPhoneNumber: 79998887766,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Привет из Telegram' },
  },
}

describe('parseTelegramNotification', () => {
  it('входящее из личного чата + senderPhone', () => {
    expect(parseTelegramNotification(personal)).toEqual({
      chatId: '10000000',
      text: 'Привет из Telegram',
      idMessage: '1763115112345',
      timestamp: 1763115112 * 1000,
      senderName: 'Василиса',
      senderPhone: '79998887766',
      direction: 'incoming',
    })
  })

  it('группа: senderPhoneNumber 0 не используется', () => {
    const group: IncomingWebhookBody = {
      ...personal,
      senderData: {
        ...personal.senderData,
        chatId: '-10000000000000',
        chatType: 'supergroup',
        senderPhoneNumber: 0,
      },
    }
    const parsed = parseTelegramNotification(group)
    expect(parsed?.chatId).toBe('-10000000000000')
    expect(parsed?.senderPhone).toBeUndefined()
  })

  it('исходящие outgoingMessageReceived / outgoingAPIMessageReceived', () => {
    expect(
      parseTelegramNotification({ ...personal, typeWebhook: 'outgoingAPIMessageReceived' }),
    ).toMatchObject({ direction: 'outgoing', senderName: 'Василиса Премудрая' })
    expect(
      parseTelegramNotification({ ...personal, typeWebhook: 'outgoingMessageReceived' })
        ?.senderPhone,
    ).toBeUndefined()
  })

  it('игнорирует статусы и медиа', () => {
    expect(
      parseTelegramNotification({ ...personal, typeWebhook: 'stateInstanceChanged' }),
    ).toBeNull()
    expect(
      parseTelegramNotification({ ...personal, messageData: { typeMessage: 'imageMessage' } }),
    ).toBeNull()
  })
})

describe('Telegram auth helpers', () => {
  it('QR-страница с суффиксом /telegram', () => {
    expect(
      buildTelegramQrPageUrl({ idInstance: '4100000001', apiTokenInstance: 'tok', apiUrl: '' }),
    ).toBe('https://qr.green-api.com/waInstance4100000001/tok/telegram')
  })

  it('номер для startAuthorization', () => {
    expect(telegramAuthPhone('+7 999 000-00-00')).toBe(79990000000)
    expect(() => telegramAuthPhone('123')).toThrow()
  })

  it('расшифровка reason', () => {
    expect(telegramAuthReasonText('2fa_required')).toMatch(/2FA/)
    expect(telegramAuthReasonText('unknown_x')).toBe('unknown_x')
    expect(telegramAuthReasonText(undefined)).toBe('Ошибка авторизации')
  })
})
