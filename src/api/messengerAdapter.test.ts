import { describe, expect, it } from 'vitest'
import { getMessenger, messengerFromTypeInstance, parseMessenger } from './messenger'
import { parseNotificationFor, qrPageUrlFor, resolveChatIdFor } from './messengerAdapter'
import type { GreenApiCredentials, IncomingWebhookBody } from './types'

const max: GreenApiCredentials = {
  idInstance: '1101000001',
  apiTokenInstance: 'tok',
  apiUrl: 'https://api.green-api.com',
}
const legacy = { ...max } // старая сессия без поля messenger
const wa: GreenApiCredentials = { ...max, messenger: 'whatsapp' }

const outgoing: IncomingWebhookBody = {
  typeWebhook: 'outgoingMessageReceived',
  idMessage: 'X1',
  senderData: { chatId: '79990000000@c.us', chatName: 'Иван' },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'hi' } },
}

describe('messenger', () => {
  it('по умолчанию MAX, в т.ч. для старых сессий', () => {
    expect(getMessenger(legacy)).toBe('max')
    expect(getMessenger(null)).toBe('max')
    expect(parseMessenger('WhatsApp')).toBe('whatsapp')
    expect(parseMessenger('telegram')).toBe('max')
    expect(messengerFromTypeInstance('whatsapp')).toBe('whatsapp')
  })
})

describe('resolveChatIdFor', () => {
  it('MAX: короткий числовой ID сохраняется (поведение не изменилось)', () => {
    expect(resolveChatIdFor(max, '10000000')).toBe('10000000')
    expect(resolveChatIdFor(max, '79990000000')).toBe('79990000000@c.us')
  })

  it('WhatsApp: только номер@c.us / @g.us', () => {
    expect(resolveChatIdFor(wa, '+7 999 000 00 00')).toBe('79990000000@c.us')
    expect(() => resolveChatIdFor(wa, '10000000')).toThrow()
  })
})

describe('parseNotificationFor', () => {
  it('MAX игнорирует исходящие (как раньше)', () => {
    expect(parseNotificationFor(max, outgoing)).toBeNull()
  })

  it('WhatsApp показывает исходящие с телефона', () => {
    expect(parseNotificationFor(wa, outgoing)).toMatchObject({ direction: 'outgoing', text: 'hi' })
  })

  it('MAX входящее помечается direction=incoming', () => {
    const incoming: IncomingWebhookBody = {
      ...outgoing,
      typeWebhook: 'incomingMessageReceived',
      senderData: { chatId: '10000000' },
    }
    expect(parseNotificationFor(max, incoming)).toMatchObject({
      chatId: '10000000',
      direction: 'incoming',
    })
  })
})

describe('qrPageUrlFor', () => {
  it('MAX — /v3, WhatsApp — без /v3', () => {
    expect(qrPageUrlFor(max)).toBe('https://qr.green-api.com/waInstance1101000001/tok/v3')
    expect(qrPageUrlFor(wa)).toBe('https://qr.green-api.com/waInstance1101000001/tok')
  })
})
